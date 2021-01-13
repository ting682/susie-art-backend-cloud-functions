import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'
// const path = require('path')

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
admin.initializeApp()

// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//     response.send("hello again!")
//   // response.sendFile(path.join(__dirname+'/index.html'));
// });
const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser');
const { Client, Environment, ApiError } = require('square');

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

const exampleVar = process.env.SANDBOX_ID
app.get("/", function (req :any, res :any) {
    // res.sendFile(__dirname + '/index.html');
    res.render("home", {exampleVar}) 
   })

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
  const paymentsApi = client.paymentsApi;
  const requestBody = {
    sourceId: requestParams.nonce,
    amountMoney: {
      amount: requestParams.amount, // $1.00 charge
      currency: 'USD'
    },

    locationId: requestParams.location_id,
    idempotencyKey: requestParams.idempotency_key,
  };

  try {
    const response = await paymentsApi.createPayment(requestBody);
    res.status(200).json({
      'title': 'Payment Successful',
      'result': response.result
    });
  } catch(error) {
    let errorResult = null;
    if (error instanceof ApiError) {
      errorResult = error.errors;
    } else {
      errorResult = error;
    }
    res.status(500).json({
      'title': 'Payment Failure',
      'result': errorResult
    });
  }
});


exports.payments = functions.https.onRequest(app)
