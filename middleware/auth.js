const { decode_token} = require('../helpers/jsw')
const { User } = require("../models/index");

async function authentication (req, res, next){
    try {
        let token = req.headers.access_token
        if (!token){
            throw ({name : 'Unauthorized'})
        }
        let payload = decode_token(token)
        let user = await User.findByPk(payload.id)
        if (!user) {
            throw ({name: 'Unauthorized'})
        }
        req.user = user
        next()
    } catch (error) {
        next(error)
    }
}

// async function authorization (req, res, next) {
//     try {
//         let post = await Post.findByPk(req.params.id)
//         if (!post) {
//             throw {name: 'notFound'}
//         } else {
//             let authorId = post.authorId
//             let userId = req.user.id
//             let userRole = req.user.role 
            
//             if ((authorId !== userId && userRole !== "Admin")) {
//                 throw{ name : 'forbidden'}
//             }
//             next()
//         }
//     } catch (error) {
//        next(error)
//     }
// }

module.exports = {authentication}