const express = require('express')
const router = express.Router()
const Controller = require('../controllers/controller')

router.post('/register', Controller.register)
router.post('/login', Controller.login)
router.post('/googleLogin', Controller.loginGoogle)
router.put('/forgotpassword', Controller.forgotpassword)
router.put('/resetpassword', Controller.resetpassword)


module.exports = router