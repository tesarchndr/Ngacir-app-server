const nodemailer = require('nodemailer')


exports.kirimEmail = dataEmail => {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: 'tesarchandraesnawan@gmail.com', 
          pass: 'tfwxtkmiwofmscsu', 
        },
    });
    return (
        transporter.sendMail(dataEmail)
        .then(info => console.log(`email terkirim : ${info.messageId}`))
        .catch(err => console.log(`error ${err}`))
    )
}