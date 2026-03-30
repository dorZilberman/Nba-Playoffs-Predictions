import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const LAUNCH_TTL_MS = 15_000
let launchCache: { expires: number; iso: string | null } | null = null

async function getSiteLaunchIso(request: NextRequest): Promise<string | null> {
  const now = Date.now()
  if (launchCache && now < launchCache.expires) {
    return launchCache.iso
  }
  try {
    const url = new URL("/api/season/site-launch", request.nextUrl.origin)
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      launchCache = { expires: now + 5_000, iso: null }
      return null
    }
    const data = (await res.json()) as { siteLaunchTime?: string | null }
    const iso = data.siteLaunchTime ?? null
    launchCache = { expires: now + LAUNCH_TTL_MS, iso }
    return iso
  } catch {
    launchCache = { expires: now + 5_000, iso: null }
    return null
  }
}

function isPreLaunch(iso: string | null): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() < t
}

function isApiAllowedDuringPreLaunch(path: string): boolean {
  const allowed = [
    "/api/auth",
    "/api/health",
    "/api/season/site-launch",
    "/api/teams",
  ]
  return allowed.some((p) => path === p || path.startsWith(`${p}/`))
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const id = crypto.randomUUID()
  const startMs = Date.now()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-request-id", id)
  requestHeaders.set("x-request-start-ms", String(startMs))
  requestHeaders.set("x-next-pathname", path)

  const nextWithHeaders = () =>
    NextResponse.next({
      request: { headers: requestHeaders },
    })

  const isApi = path.startsWith("/api/")
  if (isApi && path !== "/api/health") {
    console.info(
      "[nba-app:api]",
      JSON.stringify({
        phase: "start",
        id,
        method: request.method,
        path,
        at: new Date().toISOString(),
      })
    )
  }

  if (path === "/api/season/site-launch") {
    return nextWithHeaders()
  }

  const secret = process.env.NEXTAUTH_SECRET
  const token =
    secret != null && secret.length > 0
      ? await getToken({ req: request, secret })
      : null
  const isAdmin = Boolean(token?.isAdmin)

  const launchIso = await getSiteLaunchIso(request)
  const preLaunch = isPreLaunch(launchIso)

  if (!preLaunch || isAdmin) {
    return nextWithHeaders()
  }

  if (!token) {
    return nextWithHeaders()
  }

  if (isApi) {
    if (isApiAllowedDuringPreLaunch(path)) {
      return nextWithHeaders()
    }
    return NextResponse.json(
      { error: "Site not launched yet" },
      { status: 403 }
    )
  }

  if (path === "/signin" || path === "/launch" || path === "/rules") {
    return nextWithHeaders()
  }

  const url = request.nextUrl.clone()
  url.pathname = "/launch"
  url.search = ""
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
