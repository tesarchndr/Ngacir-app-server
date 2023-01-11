const express = require('express')
const router = express.Router()
const userRouter = require('./userRouter')
const Controller = require('../controllers/controller')



router.get('/', Controller.readAllProduct)


module.exports = router