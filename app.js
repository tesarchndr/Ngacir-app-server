if (process.env.NODE_ENV != 'production'){
    require('dotenv').config()
}
const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const cors = require('cors')
const router = require('./router/index')

app.use(require('connect-history-api-fallback')({
    disableDotRule: true
}))

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use('/', router)

app.use((err, req, res, next) => {
    let status = 500
    let message = "Internal server error"
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        status = 400
        message = err.errors[0].message
    } else if (err.name === "Password is required" || err.name === "Email is required" || err.name ==='Choose One' || err.name === 'Name is required') {
        status = 400
        message = err.name
    } else if (err.name === "Invalid email/password" ){
        status = 401
        message = err.name
    } else if (err.name ===  "Data not found"){
        status = 404
        message = err.name
    } else if (err.name === 'Unauthorized'){
        status = 401
        message = err.name
    }

    console.log(err);

    res.status(status).json({message: message})
})


app.listen(port, () => {
    console.log(`Mashok`)
})