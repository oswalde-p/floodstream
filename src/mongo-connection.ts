import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGO_URI
if (!uri) {
    throw new Error('Missing MONGO_URI environment variable')
}

const client = new MongoClient(uri, {}) // todo add keys

let db: Db

async function connect(): Promise<Db> {
    await client.connect()
    console.log('Mongo connected') // eslint-disable-line no-console
    db = client.db()
    return db
}

export { connect, db }
