const express = require('express')
const router = express.Router()
const userRouter = require('./userRouter')
const productRouter = require('./productRouter')
const { authentication } = require('../middleware/auth')
const Controller = require('../controllers/controller')


router.use('/users', userRouter)
router.use('/products', authentication, productRouter)
router.post('/trx', authentication, Controller.createTRX)
router.post('/trx/email', authentication, Controller.sendEmail)
router.get('/trx/:customerName', authentication, Controller.readTRXByName)

router.post('/histories', authentication, Controller.addHistory)
router.get('/histories', authentication, Controller.readHistory)
router.get('/histories/week', authentication, Controller.readHistoryWeek)

module.exports = router