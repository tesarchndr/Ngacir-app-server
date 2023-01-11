const bcrypt = require('bcrypt')

const hashPassword = ((password) => {
    return bcrypt.hashSync(password, 10)
})
const compareHash = ((password, hash) => {
    return bcrypt.compareSync(password, hash)
})

module.exports = {hashPassword, compareHash}