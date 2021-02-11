import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'
// const path = require('path')

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
admin.initializeApp()

// admin.initializeApp()

// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//     response.send("hello again!")
//   // response.sendFile(path.join(__dirname+'/index.html'));
// });
const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser');
const { Client, Environment, ApiError } = require('square');
import { v4 as uuidv4 } from 'uuid'
const app = express();

app.use(cors({origin: true}))
app.set('view engine', 'ejs'); 

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }

// Set the Access Token which is used to authorize to a merchant
// const accessToken = process.env.SANDBOX_ACCESS_TOKEN;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(express.static(__dirname));

// const exampleVar = process.env.SANDBOX_ID
// app.get("/", function (req :any, res :any) {
//     // res.sendFile(__dirname + '/index.html');
//     res.render("home", {exampleVar}) 
//    })

// Initialized the Square api client:
//   Set sandbox environment for testing purpose
//   Set access token
const client = new Client({
  environment: Environment.Sandbox,
  accessToken: functions.config().square.accesstoken,
});

app.post('/', async (req: any, res: any) => {
  const requestParams = req.body;

  // Charge the customer's card
  const orderId = uuidv4()
  let lineItems :any = [];
  
  const paymentsApi = client.paymentsApi;
  const requestBody = {
    sourceId: requestParams.nonce,
    amountMoney: {
      amount: requestParams.amount, // $1.00 charge
      currency: 'USD',
    },
    order_id: orderId,
    locationId: requestParams.location_id,
    idempotencyKey: requestParams.idempotency_key,
    buyer_email_address: requestParams.emailAddress,
    billing_address: {
      first_name: requestParams.billing.firstName,
      last_name: requestParams.billing.lastName,
      address_1: requestParams.billing.address1,
      address_2: requestParams.billing.address2,
      locality: requestParams.billing.city,
      postal_code: requestParams.billing.zip,
    },
    shipping_address: {
      first_name: requestParams.shipping.firstName,
      last_name: requestParams.shipping.lastName,
      address_1: requestParams.shipping.address1,
      address_2: requestParams.shipping.address2,
      locality: requestParams.shipping.city,
      postal_code: requestParams.shipping.zip,
    },
    statement_description_identifier: orderId,
    verification_token: requestParams.buyerVerificationToken,
  };

  try {
    const response = await paymentsApi.createPayment(requestBody);
    res.status(200).json({
      'title': 'Payment Successful',
      'result': response.result,
    });

    jwt.verify(requestParams.uid, functions.config().jwt.secret, async (err :any , data :any) => {
      if(err){
        res.sendStatus(403)
      } 
      else if(data.uid){
        req.uid = data.uid
  
        
  
        const cartsRef = admin.database().ref('carts/' + data.uid)
        cartsRef.once('value').then(async snap => {
          const cartData = snap.val()
          
          let updatedAt;
          for (const [key, item] of Object.entries(cartData)) {
            
            const itemValue:any = item
            
            
  
            if (key === 'updatedAt') {
              updatedAt = itemValue
            } else {
              
              lineItems.push({
                quantity: "1", 
                name: itemValue.item.title,
                image: itemValue.item.imageUrl,
                description: itemValue.item.description,
                price: itemValue.item.price,
                basePriceMoney: {
                  amount: itemValue.item.price,
                  currency: 'USD',
                },
              })
            }
            
          }
  
          
  
          client.ordersApi.createOrder({
            order: {
              locationId: requestParams.location_id,
              referenceId: response.result.payment.orderId,
              lineItems: lineItems,
              idempotencyKey: requestParams.idempotency_key,
            },
          })
          
          const orderRef = admin.database().ref('orders/' + orderId)
        
          await orderRef.set({
            squareOrderId: response.result.payment.orderId,
            orderId: orderId,
            lineItems: lineItems,
            squareUpdatedAt: response.result.payment.updatedAt,
            updatedAt: updatedAt,
            billing: requestParams.billing,
            orderLocaleDate: requestParams.orderLocaleDate,
            totalPrice: requestParams.amount,
            shipping: requestParams.shipping,
            emailAddress: requestParams.emailAddress,
            squarePaymentId: response.result.payment.id,
            receiptNumber: response.result.payment.receiptNumber,
            receiptUrl: response.result.payment.receiptUrl,
          })

        }).catch(errorData => {
          res.json({error: errorData})
        })
     }
    })

    
  } catch(error) {
    let errorResult = null;
    if (error instanceof ApiError) {
      errorResult = error.errors;
    } else {
      errorResult = error;
    }
    res.status(500).json({
      'title': 'Payment Failure',
      'result': errorResult,
    });
  }
});


exports.payments = functions.https.onRequest(app)

const jwt = require('jsonwebtoken');
// const session = require('express-session');
// const FirebaseStore = require('connect-session-firebase')(session);
const cart = express();
cart.use(cors({ origin: "http://localhost:3002", credentials: true, preflightContinue: true }));
const cookieParser = require('cookie-parser');
// cart.use(session({
    
//     store: new FirebaseStore({
//       database: ref.database(),
//    }),
//    secret: functions.config().jwt.secret,
//    name: '__session',
//    saveUninitialized: true,
//    resave: true,
//     cookie: {
//       maxAge: 50000,
//       secure: true,
//       sameSite: 'none',
//     },
// }))
// import { v4 as uuidv4 } from 'uuid'



cart.use(cors({origin: true, preflightContinue: true}))

cart.use(cookieParser());

cart.set('view engine', 'ejs'); 

cart.use(bodyParser.json());
cart.use(bodyParser.urlencoded({ extended: false }));

cart.use(function(req :any, res :any, next :any) {
  res.setHeader("Access-Control-Allow-Origin", "https://susie-wang-art.web.app");
  // res.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  
  next();
});

cart.post('/', async (req: any, res: any) => {
  res.setHeader("Access-Control-Allow-Origin", "https://susie-wang-art.web.app");
  // res.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
  
  const requestParams = req.body;
 
  const cartsRef = admin.database().ref('carts/' + requestParams.uid);
  await cartsRef.update({
      updatedAt: new Date(),
  })
  cartsRef.child(requestParams.lineItem.title).set({
      item: requestParams.lineItem,
  }).then(resp => {
      const jwtToken = jwt.sign({ uid: requestParams.uid }, functions.config().jwt.secret);
      // req.session.jwtToken = jwtToken
      res.status(200).cookie('authcookie', jwtToken, { maxAge:900000, httpOnly:true, sameSite: 'none', secure: true }).send({ jwtToken });
        // res.status(200).set('Set-Cookie', `__session=${jwtToken}`).send()
  }).catch(err => {
      res.json({ error: err });
      res.status(500).send();
  });

  

  // let userRef = admin.database().ref('users/' + requestParams.uid)

  // userRef.update({
  //   uid: requestParams.uid

  // })
  
})

cart.use(function(req :any, res :any, next :any) {
  res.setHeader("Access-Control-Allow-Origin", "https://susie-wang-art.web.app");
  // res.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  next();
});

cart.get('/', async (req: any, res: any) => {
  res.setHeader("Access-Control-Allow-Origin", "https://susie-wang-art.web.app");
  // res.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
  // const exampleVar = functions.config().square.accesstoken
  // res.send('home.ejs', {exampleVar})
  
  const authHeader = req.headers.authorization;
    
  const token = authHeader.split(' ')[1]
  

  // const authCookie = req.cookies.authcookie
  
  jwt.verify(token, functions.config().jwt.secret, (err :any , data :any) => {
    if(err){
      res.sendStatus(403)
    } 
    else if(data.uid){
      req.uid = data.uid
      const cartsRef = admin.database().ref('carts/' + data.uid)
      cartsRef.once('value').then(snap => {
        res.send(JSON.stringify({lineItems: snap.val()}))
      }).catch(errorData => {
        res.json({error: errorData})
      })
   }
  })


})

cart.patch('/', async (req :any, res :any) => {
  // res.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
  res.setHeader("Access-Control-Allow-Origin", "https://susie-wang-art.web.app");
  const requestParams = req.body;

  const authHeader = req.headers.authorization;
    
  const token = authHeader.split(' ')[1]

  jwt.verify(token, functions.config().jwt.secret, async (err :any , data :any) => {
      if(err){
        res.sendStatus(403)
      } 
      else if(data.uid){
        req.uid = data.uid
        const cartsPatchRef = admin.database().ref('carts/' + data.uid)
        
        await cartsPatchRef.update({
            updatedAt: new Date(),
        })
        cartsPatchRef.child(requestParams.lineItem).remove().then(async resp => {
            // const jwtToken = jwt.sign({ uid: requestParams.uid }, functions.config().jwt.secret);
            await cartsPatchRef.once('value', snap => {
              res.json({data: snap.val()})
            })
            // res.status(200).cookie('authcookie', jwtToken, { maxAge:900000, httpOnly:true, sameSite: 'none', secure: true }).send({ jwtToken });
        }).catch(errors => {
            res.json({ error: errors });
            res.status(500).send();
        });
          }
          })

  

})



exports.carts = functions.https.onRequest(cart)


// const nodemailer = require('nodemailer')


// const aws = require('aws-sdk')


// aws.config.update({
//   accessKeyId: functions.config().aws.accesskeyid,
//   secretAccessKey: functions.config().aws.secretaccesskey,
//   region: "us-east-1"
// })

const mailgun = require("mailgun-js");

// const DOMAIN = "sandbox33c8b0872ffa4b329818517167470c60.mailgun.org";
const DOMAIN = "mail.susiewang.art"

exports.sendOrderEmailConfirmation = functions.database.ref('/orders/{orderId}').onCreate(async (snapshot, context) => {

  const mg = mailgun({apiKey: functions.config().mailgun.apikey, domain: DOMAIN});

  //to: order.emailAddress,

  const order = snapshot.val()

  let orderItemRows:string = ``

  order.lineItems.map((item :any) => {

    orderItemRows += `<tr>
    <td valign="top" align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
          <tr>
            <td valign="top">
              <table width="120" border="0" cellspacing="0" cellpadding="0" align="left" style="width:120px;" class="em_wrapper">
                  <tr>
                    <td valign="top" align="center"><img src="${item.image.url}" width="120" height="120" alt=${item.image.alt} border="0" style="display:block; max-width:120px; font-family:Arial, sans-serif; font-size:17px; line-height:20px; color:#000000; font-weight:bold;" /></td>
                  </tr>
                </table>
                <table width="25" border="0" cellspacing="0" cellpadding="0" align="left" style="width:25px;" class="em_hide">
                  <tr>
                    <td valign="top" align="left" width="25" style="width:25px;" class="em_hide">&nbsp;</td>
                  </tr>
                </table>
                <table width="405" border="0" cellspacing="0" cellpadding="0" align="left" style="width:405px;" class="em_wrapper">
                  
                  <tr>
                    <td class="em_grey" align="left" valign="top" style="font-family: Arial, sans-serif; font-size: 18px; line-height: 22px; color:#434343; font-weight:bold;">${item.name}</td>
                  </tr>
                  <tr>
                    <td height="13" style="height:13px; font-size:1px; line-height:1px;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td class="em_grey" align="left" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; color:#434343;">${item.description}</td>
                  </tr>
                  <tr>
                    <td height="13" style="height:13px; font-size:1px; line-height:1px;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td class="em_grey" align="left" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; color:#434343;">Quantity: <span style="color:#da885b; font-weight:bold;">1</span></td>
                  </tr>
                  <tr>
                    <td height="13" style="height:13px; font-size:1px; line-height:1px;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td class="em_grey" align="left" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; color:#434343;">Amount ($): <span style="color:#da885b; font-weight:bold;">$${item.price}</span></td>
                  </tr>

                </table>
            </td>
          </tr>
        </table>
    </td>
  </tr>
  <tr>
    <td height="25" style="height:25px;" class="em_h10">&nbsp;</td>
  </tr>
  `
    

  })

  const orderhtml = `<!DOCTYPE html>
  <html  style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  <head>
  <meta name="viewport" content="width=device-width" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <style type="text/css">
  body {
    margin: 0;
    padding: 0;
  }
  img {
    border: 0 !important;
    outline: none !important;
  }
  p {
    Margin: 0px !important;
    Padding: 0px !important;
  }
  table {
    border-collapse: collapse;
    mso-table-lspace: 0px;
    mso-table-rspace: 0px;
  }
  td, a, span {
    border-collapse: collapse;
    mso-line-height-rule: exactly;
  }
  </style>
  
  </head>
  <body itemscope itemtype="http://schema.org/EmailMessage" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; width: 100% !important; height: 100%; line-height: 1.6em; background-color: #f6f6f6; margin: 0;" bgcolor="#f6f6f6">
  
  <table width="100%" border="0" cellspacing="0" cellpadding="0" class="em_full_wrap" align="center" bgcolor="#efefef">
      <tr>
        <td align="center" valign="top" class="em_aside5"><table align="center" width="650" border="0" cellspacing="0" cellpadding="0" class="em_main_table" style="width:650px; table-layout:fixed;">
            <tr>
              <td align="center" valign="top" style="padding:0 25px; background-color:#ffffff;" class="em_aside10"><table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td height="25" style="height:25px;" class="em_h10">&nbsp;</td>
                </tr>
                <tr>
                  <td valign="top" align="center"><img src="https://firebasestorage.googleapis.com/v0/b/susie-wang-art.appspot.com/o/logo%2Fsusie_wang_art_logo.png?alt=media&token=780fecd0-0bdd-48f6-997a-442085a2543d" width="200" height="200" class="em_full_img2" alt="Susie Wang Art Logo" border="0" style="display:block; max-width:380px; font-family:Arial, sans-serif; font-size:17px; line-height:20px; color:#000000; font-weight:bold;" /></td>
                </tr>
                <tr>
                  <td height="22" style="height:22px;" class="em_h20">&nbsp;</td>
                </tr>
                <tr>
                  <td class="em_blue em_font_22" align="center" valign="top" style="font-family: Arial, sans-serif; font-size: 26px; line-height: 29px; color:#264780; font-weight:bold;">Susie Wang Art Thanks You</td>
                </tr>
                <tr>
                  <td height="15" style="height:15px; font-size:0px; line-height:0px;">&nbsp;</td>
                </tr>
                <tr>
                  <td class="em_grey" align="center" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 22px; color:#434343;">${order.billing.firstName}, thanks so much for choosing Susie Wang Art Studio.<br class="em_hide" />
  We’ve received your order, and will begin processing and notify you of your status within 48 hours.&nbsp;</td>
                </tr>
                <tr>
                  <td height="15" style="height:15px; font-size:1px; line-height:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td class="em_grey" align="center" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 22px; color:#434343;"><strong>Order #:</strong> <span style="color:#da885b; text-decoration:underline;">${context.params.orderId}</span> <span class="em_hide2">&nbsp;|&nbsp;</span><span class="em_mob_block"></span> <strong>Order Date:</strong> ${order.orderLocaleDate}</td>
                </tr>
                <tr>
                  <td height="20" style="height:20px; font-size:1px; line-height:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td align="center" valign="top"><table width="145" style="width:145px; background-color:#6bafb2; border-radius:4px;" border="0" cellspacing="0" cellpadding="0" align="center" bgcolor="#6bafb2">
                    <tr>
                      <td class="em_white" height="42" align="center" valign="middle" style="font-family: Arial, sans-serif; font-size: 16px; color:#ffffff; font-weight:bold; height:42px;"><a href="https://www.mailgun.com" target="_blank" style="text-decoration:none; color:#ffffff; line-height:42px; display:block;">Order Status</a></td>
                    </tr>
                  </table>
                  </td>
                </tr>
                <tr>
                  <td height="40" style="height:40px;" class="em_h10">&nbsp;</td>
                </tr>
  
              </table>
              </td>
            </tr>
            <tr>
              <td height="15" class="em_h10" style="height:15px; font-size:1px; line-height:1px;">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" valign="top" style="padding:0 50px; background-color:#ffffff;" class="em_aside10">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td height="35" style="height:35px;" class="em_h10">&nbsp;</td>
                </tr>
                <tr>
                  <td class="em_grey" align="center" valign="top" style="font-family: Arial, sans-serif; font-size: 18px; line-height: 22px; color:#434343; font-weight:bold;">BILLED TO:</td>
                </tr>
                <tr>
                  <td height="10" style="height:10px; font-size:1px; line-height:1px;">&nbsp;</td>
                </tr>
  
                <tr>
                  <td class="em_grey" align="center" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color:#434343;">${order.billing.firstName} ${order.billing.lastName}<br />
  ${order.billing.address1}<br />${order.billing.address2}<br />${order.billing.city}, ${order.billing.state} ${order.billing.zip}
  </td>
                </tr>
                <tr>
                  <td height="20" style="height:20px; font-size:1px; line-height:1px;">&nbsp;</td>
                </tr>
  
                <tr>
                  <td height="1" bgcolor="#efefef" style="height:1px; background-color:#efefef; font-size:0px; line-height:0px;"><img src="/assets/pilot/images/templates/spacer.gif" width="1" height="1" alt="" border="0" style="display:block;" /></td>
                </tr>
  
                <tr>
                  <td height="25" class="em_h20" style="height:25px; font-size:1px; line-height:1px;">&nbsp;</td>
                </tr>
                ${orderItemRows}
                
                <tr>
                  <td height="25" class="em_h20" style="height:25px; font-size:1px; line-height:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td height="1" bgcolor="#efefef" style="height:1px; background-color:#efefef; font-size:0px; line-height:0px;"><img src="/assets/pilot/images/templates/spacer.gif" width="1" height="1" alt="" border="0" style="display:block;" /></td>
                </tr>
                <tr>
                  <td height="21" class="em_h20" style="height:21px; font-size:1px; line-height:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td valign="top" align="right" style="padding-bottom:5px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" align="right">
                        <tr>
                          <td>&nbsp;</td>
                          <td class="em_grey" width="100" align="right" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; color:#434343; width:100px;">Subtotal</td>
                          <td width="20" style="width:20px; font-size:0px; line-height:0px;"></td>
                          <td width="100" class="em_grey" align="right" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; color:#434343; width:100px;">$850</td>
                        </tr>
                      </table>
                  </td>
                </tr>
                <tr>
                  <td valign="top" align="right" style="padding-bottom:10px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" align="right">
                        <tr>
                          <td>&nbsp;</td>
                          <td class="em_grey" width="100" align="right" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; color:#434343; width:100px;">Sales Tax </td>
                          <td width="20" style="width:20px; font-size:0px; line-height:0px;"></td>
                          <td width="100" class="em_grey" align="right" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; color:#434343; width:100px;">$76.50</td>
                        </tr>
                      </table>
                  </td>
                </tr>
                <tr>
                  <td valign="top" align="right">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" align="right">
                        <tr>
                          <td>&nbsp;</td>
                          <td class="em_grey" width="100" align="right" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; color:#434343; width:100px; font-weight:bold;">Total</td>
                          <td width="20" style="width:20px; font-size:0px; line-height:0px;"></td>
                          <td width="100" class="em_grey" align="right" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; color:#434343; width:100px; font-weight:bold;">$${(order.totalPrice / 100).toFixed(2)}</td>
                        </tr>
                      </table>
                  </td>
                </tr>
                <tr>
                  <td height="36" style="height:36px;" class="em_h10">&nbsp;</td>
                </tr>
              </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
  </table>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" class="em_full_wrap" align="center" bgcolor="#efefef">
      <tr>
        <td align="center" valign="top"><table align="center" width="650" border="0" cellspacing="0" cellpadding="0" class="em_main_table" style="width:650px; table-layout:fixed;">
            <tr>
              <td align="center" valign="top" style="padding:0 25px;" class="em_aside10"><table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td height="40" style="height:40px;" class="em_h20">&nbsp;</td>
                </tr>
                <tr>
                  <td align="center" valign="top"><table border="0" cellspacing="0" cellpadding="0" align="center">
                      <tr>
                        <td width="30" style="width:30px;" align="center" valign="middle"><a href="https://www.facebook.com/Susie.Ketty.Riley" target="_blank" style="text-decoration:none;"><img src="https://firebasestorage.googleapis.com/v0/b/susie-wang-art.appspot.com/o/icons%2Ffacebook_icon.png?alt=media&token=deea5478-a4b5-4a07-9bf7-d53d63737556" width="30" height="30" alt="Fb" border="0" style="display:block; font-family:Arial, sans-serif; font-size:18px; line-height:25px; text-align:center; color:#000000; font-weight:bold; max-width:30px;" /></a></td>
                        <td width="12" style="width:12px;">&nbsp;</td>
                        <td width="30" style="width:30px;" align="center" valign="middle"><a href="https://twitter.com/SusieWangCFA" target="_blank" style="text-decoration:none;"><img src="https://firebasestorage.googleapis.com/v0/b/susie-wang-art.appspot.com/o/icons%2Ftwitter_icon.png?alt=media&token=3ca35199-0cfa-4bf4-9d56-ac9c0a8b2169" width="30" height="30" alt="Insta" border="0" style="display:block; font-family:Arial, sans-serif; font-size:14px; line-height:25px; text-align:center; color:#000000; font-weight:bold; max-width:30px;" /></a></td>
                        <td width="12" style="width:12px;">&nbsp;</td>
                        <td width="30" style="width:30px;" align="center" valign="middle"><a href="https://www.instagram.com/susie_wang26/" target="_blank" style="text-decoration:none;"><img src="https://firebasestorage.googleapis.com/v0/b/susie-wang-art.appspot.com/o/icons%2Finstagram_icon.png?alt=media&token=99516536-8eca-4e9b-830f-4c32e370a8e1" width="30" height="30" alt="Tw" border="0" style="display:block; font-family:Arial, sans-serif; font-size:14px; line-height:25px; text-align:center; color:#000000; font-weight:bold; max-width:30px;" /></a></td>
      
                      </tr>
                    </table>
                   </td>
                </tr>
                <tr>
                  <td height="16" style="height:16px; font-size:1px; line-height:1px; height:16px;">&nbsp;</td>
                </tr>
                <tr>
                  <td class="em_grey" align="center" valign="top" style="font-family: Arial, sans-serif; font-size: 15px; line-height: 18px; color:#434343; font-weight:bold;">Problems or questions?</td>
                </tr>
                <tr>
                  <td height="10" style="height:10px; font-size:1px; line-height:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td align="center" valign="top" style="font-size:0px; line-height:0px;"><table border="0" cellspacing="0" cellpadding="0" align="center">
                    <tr>
                      <td width="15" align="left" valign="middle" style="font-size:0px; line-height:0px; width:15px;"><a href="mailto:susiewangart@gmail.com" style="text-decoration:none;"><img src="https://firebasestorage.googleapis.com/v0/b/susie-wang-art.appspot.com/o/icons%2Femail_icon.png?alt=media&token=54c910a3-67cd-42b3-91ec-53ad67e85a5f" width="15" height="12" alt="" border="0" style="display:block; max-width:15px;" /></a></td>
                      <td width="9" style="width:9px; font-size:0px; line-height:0px;" class="em_w5"><img src="/assets/pilot/images/templates/spacer.gif" width="1" height="1" alt="" border="0" style="display:block;" /></td>
                      <td class="em_grey em_font_11" align="left" valign="middle" style="font-family: Arial, sans-serif; font-size: 13px; line-height: 15px; color:#434343;"><a href="mailto:meow@meowgun.com" style="text-decoration:none; color:#434343;">meow@meowgun.com</a> <a href="mailto:marketing@mailgun.com" style="text-decoration:none; color:#434343;">[mailto:marketing@mailgun.com]</a></td>
                    </tr>
                  </table>
                  </td>
                </tr>
                 <tr>
                  <td height="9" style="font-size:0px; line-height:0px; height:9px;" class="em_h10"><img src="/assets/pilot/images/templates/spacer.gif" width="1" height="1" alt="" border="0" style="display:block;" /></td>
                </tr>
                 <tr>
                  <td align="center" valign="top"><table border="0" cellspacing="0" cellpadding="0" align="center">
                    <tr>
                      <td width="12" align="left" valign="middle" style="font-size:0px; line-height:0px; width:12px;"><a href="#" target="_blank" style="text-decoration:none;"><img src="/assets/pilot/images/templates/img_1.png" width="12" height="16" alt="" border="0" style="display:block; max-width:12px;" /></a></td>
                      <td width="7" style="width:7px; font-size:0px; line-height:0px;" class="em_w5">&nbsp;</td>
                      <td class="em_grey em_font_11" align="left" valign="middle" style="font-family: Arial, sans-serif; font-size: 13px; line-height: 15px; color:#434343;"><a href="#" target="_blank" style="text-decoration:none; color:#434343;">Meowgun</a> &bull; 123 Meow Way &bull; Cattown, CA 95389</td>
                    </tr>
                  </table>
                  </td>
                </tr>
                <tr>
                  <td height="35" style="height:35px;" class="em_h20">&nbsp;</td>
                </tr>
              </table>
              </td>
            </tr>
             <tr>
              <td height="1" bgcolor="#dadada" style="font-size:0px; line-height:0px; height:1px;"><img src="/assets/pilot/images/templates/spacer.gif" width="1" height="1" alt="" border="0" style="display:block;" /></td>
            </tr>
             <tr>
              <td align="center" valign="top" style="padding:0 25px;" class="em_aside10"><table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td height="16" style="font-size:0px; line-height:0px; height:16px;">&nbsp;</td>
                </tr>
                <tr>
                  <td align="center" valign="top"><table border="0" cellspacing="0" cellpadding="0" align="left" class="em_wrapper">
                    <tr>
                      <td class="em_grey" align="center" valign="middle" style="font-family: Arial, sans-serif; font-size: 11px; line-height: 16px; color:#434343;">&copy; Susie Wang Art Studios 2021  &nbsp;|&nbsp;  <a href="%mailing_list_unsubscribe_url%" target="_blank" style="text-decoration:underline; color:#434343;"></a>If you wish to unsubscribe, please click the unsubscribe link below.</td>
                    </tr>
                  </table>
                  </td>
                </tr>
                <tr>
                  <td height="16" style="font-size:0px; line-height:0px; height:16px;">&nbsp;</td>
                </tr>
              </table>
              </td>
            </tr>
            <tr>
              <td class="em_hide" style="line-height:1px;min-width:650px;background-color:#efefef;"><img alt="" src="/assets/pilot/images/templates/spacer.gif" height="1" width="650" style="max-height:1px; min-height:1px; display:block; width:650px; min-width:650px;" border="0" /></td>
            </tr>
          </table>
        </td>
      </tr>
  </table>
  </body>
  </html>`

  const data = {
    // from: "Susie Wang art  <postmaster@sandbox33c8b0872ffa4b329818517167470c60.mailgun.org>",
    from: "Susie Wang Art <noreply@mail.susiewang.art>",
    to: "tchung682@gmail.com",
    subject: 'Susie Wang Art order confirmation ' + context.params.orderId,
    text: 'Thank you for your order.' + context.params.orderId,
    html: '<h1>Susie Wang Art</h1>' + orderhtml,
  };

  mg.messages().send(data, function (error :any, body :any) {
    if (error) {
      console.log("error ", error)
    }
    console.log(body);
  });
  


  // let ses = new aws.SES({
  //   apiVersion: '2010-12-01'
  // })

  // var params = {
  //   Template: { 
  //     TemplateName: 'EmailOrderConfirmation', 
  //     HtmlPart: 'Susie Art Order Confirmation {{orderId}}',
  //     SubjectPart: '<h1>Hello {{name}},</h1><p>{{favoriteanimal}}.</p>',
  //     TextPart: '<h1>Hello {{name}},</h1><p>Your favorite animal is {{favoriteanimal}}.</p>'
  //   }
  // };

  // ses.createTemplate(params, function(err: any, data: any) {
  //   if (err) console.log(err, err.stack); // an error occurred
  //   else     console.log(data);           // successful response
  // });

  // let transporter = nodemailer.createTransport({
  //   SES: new aws.SES({
  //     apiVersion: '2010-12-01'
  //   })
  // })

  // const order = snapshot.val()

  // const mailOptions = {
  //   from: 'Susie Wang art <tchung682@gmail.com>',
  //   to: order.emailAddress,
  //   subject: 'Order for Susie Wang Art ' + context.params.orderId + ' confirmation email',
  //   text: 'Thank you for your order. We are processing and will notify you.'
  // }

  // try {

  //   await transporter.sendMail(mailOptions);
  //   console.log('email sent')
  // } catch (error) {
  //   console.error("Error ", error)
  // }

})