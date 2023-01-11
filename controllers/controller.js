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

    static async readAllProduct(req, res, next){
        try {
            const {type} = req.query
            let option = {where: {}}
            if (type) {
                option.where.type = type
            }
            let data = await Product.findAll(option)
            res.status(200).json(data)
        } catch (error) {
            next(error)
        }
    }

    static async createTRX(req, res, next){
        try {
            const data = req.body
            if (data.data.length === 0) {
                throw { name : 'Choose One'}
            } else if (!data.customerName) {
                throw { name : 'Name is required'}
            }
            data.data.map(el => {
                el.ProductId = el.id,
                el.UserId = req.user.id,
                el.price = el.price * el.amount
                el.customerName = data.customerName
                delete el.id
                delete el.name
                delete el.imageUrl
                return el
            })
            await Transaction.bulkCreate(data)
            // const data2 = 
            res.status(200).json({message: 'Success create Transaction'})
        } catch (error) {
            next(error)
        }
    }

    static async readTRXByName(req, res, next){
        try {
            const {customerName}= req.params 
            let data = await Transaction.findAll({where: {customerName}, include: ['Product']})
            let price = 0
            data.forEach(el => {
                price += el.price
            });
            res.status(200).json({data,price})
        } catch (error) {
            next(error)
        }
    }

    static async forgotpassword(req, res, next){
        try {
            const {email} = req.body
            const user = await User.findOne({where: {email}})
            if (!user) {
                throw{name : "Data not found"}
            }
            let payload = {
                id: user.id
            }
            const token = create_token(payload).split('.').join('')
            await User.update({resetPasswordLink: token}, {where: {email}})
            const templateEmail = {
                from: 'tesarchandraesnawan@gmail.com',
                to: email,
                subject: 'Link Reset Password',
                html: `<h1>Haii, Dicatet ya emailnya!</h1> <p>silahkan klik link dibawah</p> <p>${process.env.BASE_URL}/resetpassword/${token}</p>`
            }
            kirimEmail(templateEmail)
            res.status(200).json('Link berhasil terkirim')
        } catch (error) {
          next(error)   
        }
    }

    static async resetpassword(req, res, next){
        try {
            const {token, password} = req.body
            const user = await User.findOne({resetPasswordLink: token})
            if (user) {
                const hash = hashPassword(password)
                await User.update({password: hash}, {where: {resetPasswordLink: token}})
                res.status(200).json({message: 'Password berhasil diubah'})
            }
        } catch (error) {
            next(error)
        }
    }

    

    

    
    
}

module.exports = Controller