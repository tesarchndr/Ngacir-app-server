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
                <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" style="width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
<head>
<meta charset="UTF-8">
<meta content="width=device-width, initial-scale=1" name="viewport">
<meta name="x-apple-disable-message-reformatting">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta content="telephone=no" name="format-detection">
<title>Trigger Newsletter</title><!--[if (mso 16)]>
<style type="text/css">
a {text-decoration: none;}
</style>
<![endif]--><!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--><!--[if gte mso 9]>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG></o:AllowPNG>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
<![endif]--><!--[if !mso]><!-- -->
<link href="https://fonts.googleapis.com/css?family=Lora:400,400i,700,700i" rel="stylesheet"><!--<![endif]-->
<style type="text/css">
#outlook a {
padding:0;
}
.ExternalClass {
width:100%;
}
.ExternalClass,
.ExternalClass p,
.ExternalClass span,
.ExternalClass font,
.ExternalClass td,
.ExternalClass div {
line-height:100%;
}
.es-button {
mso-style-priority:100!important;
text-decoration:none!important;
}
a[x-apple-data-detectors] {
color:inherit!important;
text-decoration:none!important;
font-size:inherit!important;
font-family:inherit!important;
font-weight:inherit!important;
line-height:inherit!important;
}
.es-desk-hidden {
display:none;
float:left;
overflow:hidden;
width:0;
max-height:0;
line-height:0;
mso-hide:all;
}
[data-ogsb] .es-button {
border-width:0!important;
padding:5px 30px 5px 30px!important;
}
@media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120%!important } h1 { font-size:26px!important; text-align:center } h2 { font-size:26px!important; text-align:center } h3 { font-size:20px!important; text-align:center } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:26px!important } .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:26px!important } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important } .es-menu td a { font-size:14px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:14px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:16px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:13px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important } .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:block!important } a.es-button, button.es-button { font-size:16px!important; display:block!important; border-left-width:0px!important; border-right-width:0px!important } .es-btn-fw { border-width:10px 0px!important; text-align:center!important } .es-adaptive table, .es-btn-fw, .es-btn-fw-brdr, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:100%!important; height:auto!important } .es-m-p0 { padding:0px!important } .es-m-p0r { padding-right:0px!important } .es-m-p0l { padding-left:0px!important } .es-m-p0t { padding-top:0px!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important } tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } }
</style>
</head>
<body style="width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:tahoma, verdana, segoe, sans-serif;padding:0;Margin:0">
<div class="es-wrapper-color" style="background-color:#F6F6F6"><!--[if gte mso 9]>
<v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
<v:fill type="tile" color="#f6f6f6"></v:fill>
</v:background>
<![endif]-->
<table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#F6F6F6">
<tr style="border-collapse:collapse">
<td valign="top" style="padding:0;Margin:0">
<table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
<tr style="border-collapse:collapse">
<td class="es-adaptive" align="center" style="padding:0;Margin:0">
<table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" cellspacing="0" cellpadding="0" align="center">
<tr style="border-collapse:collapse">
<td align="left" style="padding:10px;Margin:0"><!--[if mso]><table style="width:580px"><tr><td style="width:280px" valign="top"><![endif]-->
<table class="es-left" cellspacing="0" cellpadding="0" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;width:280px">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td class="es-infoblock es-m-txt-c" align="left" style="padding:0;Margin:0;line-height:14px;font-size:12px;color:#CCCCCC"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:14px;color:#CCCCCC;font-size:12px">Put your preheader text here</p></td>
</tr>
</table></td>
</tr>
</table><!--[if mso]></td><td style="width:20px"></td><td style="width:280px" valign="top"><![endif]-->
<table class="es-right" cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;width:280px">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="right" class="es-infoblock es-m-txt-c" style="padding:0;Margin:0;line-height:14px;font-size:12px;color:#CCCCCC"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:14px;color:#CCCCCC;font-size:12px"><a href="https://viewstripo.email/" target="_blank" class="view" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#CCCCCC;font-size:12px">View in browser</a></p></td>
</tr>
</table></td>
</tr>
</table><!--[if mso]></td></tr></table><![endif]--></td>
</tr>
</table></td>
</tr>
</table>
<table class="es-header" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0">
<table class="es-header-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#4b539f;width:600px" cellspacing="0" cellpadding="0" bgcolor="#4b539f" align="center">
<tr style="border-collapse:collapse">
<td style="padding:0;Margin:0;background-image:url(https://yzarqw.stripocdn.email/content/guids/CABINET_a131f5edf253d3f2d81be57c6397f449/images/52591536587446001.jpg);background-position:center top;background-repeat:no-repeat" align="left" background="https://yzarqw.stripocdn.email/content/guids/CABINET_a131f5edf253d3f2d81be57c6397f449/images/52591536587446001.jpg">
<table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td valign="top" height="101" align="center" style="padding:0;Margin:0;width:600px">
<table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-repeat:no-repeat" width="100%" cellspacing="0" cellpadding="0">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0;display:none"></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table>
<table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0">
<table class="es-content-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
<tr style="border-collapse:collapse">
<td style="Margin:0;padding-top:30px;padding-bottom:30px;padding-left:30px;padding-right:30px;background-position:left top;background-repeat:no-repeat" align="left">
<table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;width:540px">
<table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-image:url(https://yzarqw.stripocdn.email/content/guids/CABINET_2ba5c6d83c7b404a1c9e4ac77205a637/images/99191536833167609.png);border-color:#efefef;border-style:solid;border-width:2px;background-position:center top;background-repeat:no-repeat" width="100%" cellspacing="0" cellpadding="0" background="https://yzarqw.stripocdn.email/content/guids/CABINET_2ba5c6d83c7b404a1c9e4ac77205a637/images/99191536833167609.png">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0;display:none"></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table>
<table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
<tr style="border-collapse:collapse"></tr>
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0">
<table class="es-content-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;padding-top:20px;padding-left:20px;padding-right:20px">
<table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td valign="top" align="center" style="padding:0;Margin:0;width:560px">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0;padding-bottom:5px"><h2 style="Margin:0;line-height:29px;mso-line-height-rule:exactly;font-family:lora, georgia, 'times new roman', serif;font-size:24px;font-style:normal;font-weight:normal;color:#333333">In your cart:</h2></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;padding-bottom:10px;padding-left:20px;padding-right:20px">
<table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td valign="top" align="center" style="padding:0;Margin:0;width:560px">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0;font-size:0"><a target="_blank" href="https://viewstripo.email/" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#4B539F;font-size:16px"><img class="adapt-img" src="https://yzarqw.stripocdn.email/content/guids/CABINET_a131f5edf253d3f2d81be57c6397f449/images/48061536588376426.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" height="24"></a></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table>
<table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0">
<table class="es-content-body" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
<tr style="border-collapse:collapse">
<td align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:20px;padding-right:20px"><!--[if mso]><table style="width:560px" cellpadding="0" cellspacing="0"><tr><td style="width:148px" valign="top"><![endif]-->
<table class="es-left" cellspacing="0" cellpadding="0" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
<tr style="border-collapse:collapse">
<td class="es-m-p0r" valign="top" align="center" style="padding:0;Margin:0;width:148px">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr class="es-mobile-hidden" style="border-collapse:collapse">
<td align="center" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:20px;padding-right:20px;font-size:0">
<table width="100%" height="100%" cellspacing="0" cellpadding="0" border="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td style="padding:0;Margin:0;border-bottom:1px solid #ffffff;background:#FFFFFF none repeat scroll 0% 0%;height:1px;width:100%;margin:0px"></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table><!--[if mso]></td><td style="width:20px"></td><td style="width:392px" valign="top"><![endif]-->
<table cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;width:392px">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0">
<table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:100%" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" role="presentation">
<tr style="border-collapse:collapse">
<td style="padding:0;Margin:0"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:24px;color:#666666;font-size:16px">Name</p></td>
<td style="padding:0;Margin:0;width:60px;text-align:center"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:24px;color:#666666;font-size:16px">Qty</p></td>
<td style="padding:0;Margin:0;width:100px;text-align:center"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:24px;color:#666666;font-size:16px">Price</p></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table><!--[if mso]></td></tr></table><![endif]--></td>
</tr>
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;padding-left:20px;padding-right:20px">
<table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td valign="top" align="center" style="padding:0;Margin:0;width:560px">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0;padding-bottom:10px;font-size:0">
<table width="100%" height="100%" cellspacing="0" cellpadding="0" border="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td style="padding:0;Margin:0;border-bottom:2px solid #efefef;background:#FFFFFF none repeat scroll 0% 0%;height:1px;width:100%;margin:0px"></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
<tr style="border-collapse:collapse">
<td align="left" style="Margin:0;padding-top:10px;padding-bottom:10px;padding-left:20px;padding-right:20px"><!--[if mso]><table style="width:560px" cellpadding="0" cellspacing="0"><tr><td style="width:148px" valign="top"><![endif]-->
<table class="es-left" cellspacing="0" cellpadding="0" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
<tr style="border-collapse:collapse">
<td class="es-m-p0r" valign="top" align="center" style="padding:0;Margin:0;width:148px">
<table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0;display:none"></td>
</tr>
</table></td>
</tr>
</table><!--[if mso]></td><td style="width:20px"></td><td style="width:392px" valign="top"><![endif]-->
<table cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;width:392px">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;padding-top:15px;padding-bottom:15px">
<table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:100%" class="cke_show_border" cellspacing="1" cellpadding="1" border="0" role="presentation">
${dataTrx.map(el => {
return `
<tr style="border-collapse:collapse">
    <td valign="top" style="padding:0;Margin:0"><p class="product-name" style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:24px;color:#333333;font-size:16px">${el.name}</p></td>
    <td style="padding:0;Margin:0;width:60px;text-align:center" valign="top"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:24px;color:#333333;font-size:16px">${el.amount}</p></td>
    <td style="padding:0;Margin:0;width:100px;text-align:center" valign="top"><p class="price" style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:24px;color:#333333;font-size:16px">${formatRupiah(el.price)}</p></td>
</tr>`
})}
</table></td>
</tr>
</table></td>
</tr>
</table><!--[if mso]></td></tr></table><![endif]--></td>
</tr>
<tr style="border-collapse:collapse">
<td align="left" style="Margin:0;padding-top:5px;padding-bottom:20px;padding-left:20px;padding-right:20px"><!--[if mso]><table style="width:560px" cellpadding="0" cellspacing="0"><tr><td style="width:148px" valign="top"><![endif]-->
<table class="es-left" cellspacing="0" cellpadding="0" align="left" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
<tr style="border-collapse:collapse">
<td class="es-m-p0r" valign="top" align="center" style="padding:0;Margin:0;width:148px">
<table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0;display:none"></td>
</tr>
</table></td>
</tr>
</table><!--[if mso]></td><td style="width:20px"></td><td style="width:392px" valign="top"><![endif]-->
<table cellspacing="0" cellpadding="0" align="right" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;width:392px">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;padding-top:15px;padding-bottom:15px">
<table style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:100%" class=" cke_show_border" cellspacing="1" cellpadding="1" border="0" role="presentation">
<tr style="border-collapse:collapse">
<td valign="top" style="padding:0;Margin:0"><p class="product-name" style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:24px;color:#333333;font-size:16px">Total</p></td>
<td style="padding:0;Margin:0;width:60px;text-align:center" valign="top" align="center"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:24px;color:#333333;font-size:16px"></p></td>
<td style="padding:0;Margin:0;width:100px;text-align:center" valign="top" align="center"><p class="price" style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:24px;color:#333333;font-size:16px">${formatRupiah(totalPrice)}</p></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table><!--[if mso]></td></tr></table><![endif]--></td>
</tr>
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;padding-left:20px;padding-right:20px;padding-bottom:25px">
<table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td valign="top" align="center" style="padding:0;Margin:0;width:560px">
<table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0;display:none"></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table>
<table class="es-footer" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%;background-color:transparent;background-repeat:repeat;background-position:center top">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0">
<table class="es-footer-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" align="center">
<tr style="border-collapse:collapse">
<td align="left" style="padding:0;Margin:0;padding-top:20px;padding-left:20px;padding-right:20px">
<table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td valign="top" align="center" style="padding:0;Margin:0;width:560px">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0;padding-bottom:10px;font-size:0">
<table class="es-table-not-adapt es-social" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td valign="top" align="center" style="padding:0;Margin:0;padding-right:10px"><img title="Facebook" src="https://yzarqw.stripocdn.email/content/assets/img/social-icons/logo-black/facebook-logo-black.png" alt="Fb" width="32" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic"></td>
<td valign="top" align="center" style="padding:0;Margin:0;padding-right:10px"><img title="Twitter" src="https://yzarqw.stripocdn.email/content/assets/img/social-icons/logo-black/twitter-logo-black.png" alt="Tw" width="32" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic"></td>
<td valign="top" align="center" style="padding:0;Margin:0;padding-right:10px"><img title="Instagram" src="https://yzarqw.stripocdn.email/content/assets/img/social-icons/logo-black/instagram-logo-black.png" alt="Inst" width="32" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic"></td>
<td valign="top" align="center" style="padding:0;Margin:0"><img title="Youtube" src="https://yzarqw.stripocdn.email/content/assets/img/social-icons/logo-black/youtube-logo-black.png" alt="Yt" width="32" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic"></td>
</tr>
</table></td>
</tr>
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:tahoma, verdana, segoe, sans-serif;line-height:20px;color:#666666;font-size:13px">You are receiving this email because you have visited our site or asked us about regular newsletter. If you wish to unsubscribe from our newsletter, click <a target="_blank" class="unsubscribe" href="" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#666666;font-size:13px">here</a>.</p></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table>
<table class="es-content" cellspacing="0" cellpadding="0" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
<tr style="border-collapse:collapse">
<td align="center" style="padding:0;Margin:0">
<table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" cellspacing="0" cellpadding="0" align="center">
<tr style="border-collapse:collapse">
<td align="left" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:30px;padding-bottom:30px">
<table width="100%" cellspacing="0" cellpadding="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td valign="top" align="center" style="padding:0;Margin:0;width:560px">
<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
<tr style="border-collapse:collapse">
<td class="es-infoblock made_with" align="center" style="padding:0;Margin:0;line-height:120%;font-size:0;color:#CCCCCC"><a target="_blank" href="https://viewstripo.email/?utm_source=templates&utm_medium=email&utm_campaign=handmade&utm_content=trigger_newsletter" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#CCCCCC;font-size:12px"><img src="https://yzarqw.stripocdn.email/content/guids/cab_pub_7cbbc409ec990f19c78c75bd1e06f215/images/78411525331495932.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="125"></a></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table></td>
</tr>
</table>
</div>
</body>
</html>
               
                `
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