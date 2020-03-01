'use strict'
const fs = require('fs')
const path = require('path')

const express = require('express')
const app = express()

const cfg = require('./config.json')

const port = process.env.PORT || cfg.port || 8080

const pino = require('express-pino-logger')()
const bodyParser = require('body-parser')

app.use(pino)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use('/edit', (req, res) => {
  let data = req.body
  const editfile = path.join(__dirname, 'edits.txt')
  let line = `${data.ndx}: ${data.line}\n`
  fs.appendFile(editfile, line, (err) => {
    if(err) {
      req.log.error(err)
      res.status(500).send('Failed to save')
    } else {
      res.status(200).end()
    }
  })
})

app.use(express.static('public'))

app.listen(port, () => {
  pino.logger.info(`Started on ${port}`)
})

