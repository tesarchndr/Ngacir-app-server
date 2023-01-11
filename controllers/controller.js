const { User, Transaction, Product, History } = require('../models')
const { compareHash, hashPassword } = require('../helpers/bcrypt')
const { create_token } = require('../helpers/jsw')
const { QueryInterface, where } = require('sequelize')
const { kirimEmail } = require('../helpers/mailers')
const {Op} = require('sequelize')
const {Sequelize} = require('sequelize')
const { formatRupiah} = require('../helpers/format')
const { OAuth2Client } = require("google-auth-library");

class Controller{
    static async register (req, res, next){
        try {
            const { email, password, role = 'Admin' } = req.body
            let data = await User.create( { email, password, role } )
            res.status(201).json({id: data.id, name: data.name, email: data.email})
        } catch (error) {
            next(error)
        }
    }

    static async login (req, res, next){
        try {
            const { email, password } = req.body
            if (!email) {
                throw { name : "Email is required"}
            } else if (!password){
                throw { name : "Password is required"}
            }

            let user = await User.findOne( {where : {email}} )
            if (!user) {
                throw { name : "Invalid email/password"}
            }

            let compared = compareHash(password, user.password)

            if (!compared) {
                throw { name : "Invalid email/password"}                
            }
            let payload = {
                id: user.id
            }
            let access_token = create_token(payload)
            res.status(200).json({access_token})
        } catch (error) {
            next(error)
        }
    }


    
    
}

module.exports = Controller