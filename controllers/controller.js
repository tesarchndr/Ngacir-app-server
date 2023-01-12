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
            const { email, password, noHp, role = 'Admin' } = req.body
            let data = await User.create( { email, password, noHp,  role } )
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
            res.status(200).json({access_token, noHp: user.noHp})
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
            res.status(200).json('Succes send Email')
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
            } else {
                throw{name : "Data not found"}
            }
        } catch (error) {
            next(error)
        }
    }

    static async addHistory(req, res, next){
        try {
            const { customerName, price } = req.body
            let data = await History.create( { customerName, price , cashierName: req.user.email})
            res.status(201).json({message: 'Create History'})
        } catch (error) {
            next(error)
        }
    }

    static async readHistory(req, res, next){
        try {
            let data = await History.findAll()
            res.status(200).json(data)
        } catch (error) {
            next(error)
        }
    }

    static async readHistoryWeek(req, res, next){
        try {
            const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() -  7));
            let data = await History.findAll({
                where: {
                    createdAt: { [Op.and]: [{ [Op.gte]: sevenDaysAgo }, { [Op.lte]: new Date() }] }
                },
                attributes: [
                    [Sequelize.literal(`DATE("createdAt")`), 'date'],
                    [Sequelize.fn('sum', Sequelize.col('price')), 'price'],
                    [Sequelize.literal(`COUNT(*)`), 'count']
                ],
                group: ['date'],
            });
            
            res.status(200).json(data)
        } catch (error) {
          next(error)   
        }
    }

    static async sendEmail(req, res, next){
        try {
            const {dataTrx, customerName, totalPrice, email} = req.body
            if (dataTrx.length === 0) {
                throw { name : 'Choose One'}
            }
            if (!email) {
                throw {name : "Email is required"}
            }
            const templateEmail = {
                from: 'tesarchandraesnawan@gmail.com',
                to: email,
                subject: 'Invoice Restaurant',
                html: `
                ===================================
                <h2>Hai, ${customerName}</h2> 
                ===================================
                ${dataTrx.map(el=> {
                return `<h3>${el.name} @ ${el.amount} => <span>${formatRupiah(el.price)}</span></h3>`})}
                ===================================
                <h3>Total : ${formatRupiah(totalPrice)}</h3>
                <h4>Thanks :)</h4>`
            }
            kirimEmail(templateEmail)
            res.status(200).json({message: 'Invoice has been send'})
        } catch (error) {
            next(error)
        }
    }

    static async loginGoogle(req, response, next) {
        try {
          const token = req.headers.google_token
          const CLIENT_ID = process.env.CLIENT_ID
          const client = new OAuth2Client(CLIENT_ID);
          const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID, 
          });
          const payloadGoogle = ticket.getPayload();
          const [user, created] = await User.findOrCreate({
            where: {email: payloadGoogle.email},
            defaults : {
              email: payloadGoogle.email,
              password: "inipassword"
            },
            hooks: false
          })
    
          let payload = {
            id : user.id
          }
          let access_token = create_token(payload)
          response
            .status(201)
            .json({ access_token, email: user.email});
        } catch (error) {
          next(error);
        }
      }

      static async readHistoryDay(req, res, next){
        try {
            const {date} = req.params
            console.log(req.params);
            if (!date) {
                throw{name : "Data not found"}
            }
            let data = await History.findAll()
            // console.log(data);
            let data2 =  data.filter(el => {
               if (el.createdAt.toISOString().slice(0,10) === date) {
                return el
               }
           })
           res.status(200).json(data2)
        } catch (error) {
            next(error)
        }
      }



    

    

    

    
    
}

module.exports = Controller