'use strict'
const express = require('express')
const app = express()

const cfg = require('./config.json')

const port = process.env.PORT || cfg.port || 8080

const pino = require('express-pino-logger')()
const bodyParser = require('body-parser')

app.use(pino)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use('/some-request', (req, res) => {
  let data = req.body
  handle(data, err => {
    if(err) {
      req.log.error(err)
      res.status(err.code).send(err.msg)
    } else {
      res.status(200).end()
    }
  })
})

app.use(express.static('public'))

app.listen(port, () => {
  pino.logger.info(`Started on ${port}`)
})

