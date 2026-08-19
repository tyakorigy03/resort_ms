require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function setup() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
  })
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  await connection.query(sql)
  console.log('Database and tables ready')
  await connection.end()
}

setup().catch((error) => {
  console.error(error)
  process.exit(1)
})
