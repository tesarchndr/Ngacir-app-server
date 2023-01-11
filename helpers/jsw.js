const jwt = require('jsonwebtoken')
const secret = 'secrett'

const create_token = (payload => {
    return jwt.sign(payload, secret)
})
const decode_token = (token => {
    return jwt.verify(token, secret)
})

module.exports = {create_token, decode_token}