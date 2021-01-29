import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'
// const path = require('path')

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
const ref = admin.initializeApp()

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
      postal_code: requestParams.billing.zip
    },
    shipping_address: {
      first_name: requestParams.shipping.firstName,
      last_name: requestParams.shipping.lastName,
      address_1: requestParams.shipping.address1,
      address_2: requestParams.shipping.address2,
      locality: requestParams.shipping.city,
      postal_code: requestParams.shipping.zip
    },
    statement_description_identifier: orderId,
    verification_token: requestParams.buyerVerificationToken
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
                basePriceMoney: {
                  amount: itemValue.item.price,
                  currency: 'USD'
                }
              })
            }
            
          }
  
          
  
          client.ordersApi.createOrder({
            order: {
              locationId: requestParams.location_id,
              referenceId: response.result.payment.orderId,
              lineItems: lineItems,
              idempotencyKey: requestParams.idempotency_key
            }
          })
          
          const orderRef = admin.database().ref('orders/' + orderId)
        
          await orderRef.set({
            squareOrderId: response.result.payment.orderId,
            orderId: orderId,
            lineItems: lineItems,
            squareUpdatedAt: response.result.payment.updatedAt,
            updatedAt: updatedAt,
            billing: requestParams.billing,
            shipping: requestParams.shipping,
            emailAddress: requestParams.emailAddress,
            squarePaymentId: response.result.payment.id,
            receiptNumber: response.result.payment.receiptNumber,
            receiptUrl: response.result.payment.receiptUrl
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
  // res.setHeader("Access-Control-Allow-Origin", "https://susie-wang-art.web.app");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  
  next();
});

cart.post('/', async (req: any, res: any) => {
  // res.setHeader("Access-Control-Allow-Origin", "https://susie-wang-art.web.app");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
  
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
  // res.setHeader("Access-Control-Allow-Origin", "https://susie-wang-art.web.app");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  next();
});

cart.get('/', async (req: any, res: any) => {
  // res.setHeader("Access-Control-Allow-Origin", "https://susie-wang-art.web.app");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
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
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
  // res.setHeader("Access-Control-Allow-Origin", "https://susie-wang-art.web.app");
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

// const corsHandler = cors({origin: "http://localhost:3002", credentials: true})

exports.carts = functions.https.onRequest(cart)


const nodemailer = require('nodemailer')

const gmailEmail = functions.config().gmail.email;

const gmailPassword = functions.config().gmail.password;

const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
})

exports.sendOrderEmailConfirmation = functions.database.ref('/orders/{orderId}').onCreate(async (snapshot, context) => {

  
  const order = snapshot.val()

  const mailOptions = {
    from: '"Susie Wang Art" <tchung682@gmail.com>',
    to: order.emailAddress,
    subject: 'Order for Susie Wang Art ' + context.params.orderId + ' confirmation email',
    text: 'Thank you for your order. We are processing and will notify you.'
  }

  try {
    await mailTransport.sendMail(mailOptions);
    console.log('email sent')
  } catch (error) {
    console.error("Error ", error)
  }

})