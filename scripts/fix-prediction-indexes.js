/**
 * Script to fix Prediction model indexes
 * Run this once to update the indexes from sparse to partial
 * 
 * Usage: MONGODB_URI="your-uri" node scripts/fix-prediction-indexes.js
 * Or set MONGODB_URI in your environment
 */

const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')

// Try to load .env.local if it exists
try {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8')
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    })
  }
} catch (e) {
  // Ignore if .env.local doesn't exist or can't be read
}

async function fixIndexes() {
  try {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('MONGODB_URI not found in .env.local')
    }

    console.log('Connecting to MongoDB...')
    await mongoose.connect(uri)
    console.log('✅ Connected to MongoDB')

    const db = mongoose.connection.db
    const collection = db.collection('predictions')

    console.log('\n📋 Current indexes:')
    const indexes = await collection.indexes()
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`)
    })

    console.log('\n🔍 Checking for problematic documents...')
    const problematicSeries = await collection.countDocuments({
      seriesId: null,
      playInGameId: null
    })
    if (problematicSeries > 0) {
      console.log(`  ⚠️  Found ${problematicSeries} predictions with both seriesId and playInGameId as null`)
      console.log('  ℹ️  These will be ignored by the new partial indexes')
    } else {
      console.log('  ✅ No problematic documents found')
    }

    const totalPredictions = await collection.countDocuments({})
    console.log(`  📊 Total predictions in database: ${totalPredictions}`)

    console.log('\n🗑️  Dropping old indexes...')
    try {
      await collection.dropIndex('userId_1_seriesId_1')
      console.log('  ✅ Dropped userId_1_seriesId_1')
    } catch (e) {
      if (e.code === 27) {
        console.log('  ℹ️  Index userId_1_seriesId_1 does not exist')
      } else {
        throw e
      }
    }

    try {
      await collection.dropIndex('userId_1_playInGameId_1')
      console.log('  ✅ Dropped userId_1_playInGameId_1')
    } catch (e) {
      if (e.code === 27) {
        console.log('  ℹ️  Index userId_1_playInGameId_1 does not exist')
      } else {
        throw e
      }
    }

    console.log('\n🔨 Creating new partial indexes...')
    await collection.createIndex(
      { userId: 1, seriesId: 1 },
      {
        unique: true,
        partialFilterExpression: { seriesId: { $exists: true, $type: 'objectId' } },
        name: 'userId_1_seriesId_1'
      }
    )
    console.log('  ✅ Created userId_1_seriesId_1 (partial)')

    await collection.createIndex(
      { userId: 1, playInGameId: 1 },
      {
        unique: true,
        partialFilterExpression: { playInGameId: { $exists: true, $type: 'objectId' } },
        name: 'userId_1_playInGameId_1'
      }
    )
    console.log('  ✅ Created userId_1_playInGameId_1 (partial)')

    console.log('\n📋 Updated indexes:')
    const newIndexes = await collection.indexes()
    newIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`)
      if (idx.partialFilterExpression) {
        console.log(`    Filter: ${JSON.stringify(idx.partialFilterExpression)}`)
      }
    })

    console.log('\n✅ Index fix completed successfully!')
    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    await mongoose.disconnect()
    process.exit(1)
  }
}

fixIndexes()
