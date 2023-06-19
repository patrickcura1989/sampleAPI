let express = require('express');
let app = express();
let fs = require("fs");
let fetch = require('node-fetch');

// Add Access Control Allow Origin headers
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  });

app.get('/retrieve', async function (req, res) {
    // Sample code for reading file
    // fs.readFile("users.json", 'utf8', function (err, data) {
    //     const fileData = JSON.parse(data);
    //     const payloads = fileData.docs.map(row => row.payload);
    //     res.end(JSON.stringify(payloads));
    // });
    // Code for retrieving from db directly
    // const response = await crudToMongoDB("retrieve");

    const response = await postToDataAPI("/find");
    res.writeHead(200, {'Access-Control-Allow-Origin': '*'});
    res.end(JSON.stringify(response));
})

app.get('/insert', async function (req, res) {
    // Code for retrieving from db directly
    // const allRows = await crudToMongoDB("retrieve");

    // get all dates
    const allRows = await postToDataAPI("/find");
    const dates = allRows.map(row => row.date)

    // console.log(dates);
    // Code for inserting into db directly
    // const response = await crudToMongoDB("insert", dates);

    const response = await insert(dates);
    res.writeHead(200, {'Access-Control-Allow-Origin': '*'});
    res.end(JSON.stringify(response));
})

let server = app.listen(8081, function () {
    console.log("Example app running")
})

// Use Data API
const baseUrl = "https://ap-southeast-2.aws.data.mongodb-api.com/app/data-dyvzi/endpoint/data/v1/action";
const apiKey = 'ruYbhktY7SXlVLDnu3zKWKb3DZnA7EaZposl1zSH8yVSYUalUV9TJsa0TKduUNhk'
const database = "amp";
const collection = 'rates';
const dataSource = "Cluster0";
async function postToDataAPI(action, document) {
    const url = baseUrl + action;
    const data = {
        "database":database,
        "collection":collection,
        "dataSource":dataSource,
        "document": document
    };
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            'Access-Control-Request-Headers': '*',
            'api-key': apiKey,
        },
        body: JSON.stringify(data),
    });
    const responseJson = await response.json();
    return responseJson.documents;
}


async function insert(dates) {

    let result = "ERROR";

    const response = await fetch('https://www.amp.co.nz/amp/returns-unit-prices/amp-new-zealand-retirement');
    const text = await response.text();
    // console.log(text);
    //let date = text.match(/(?<=\<p>Unit prices effective as at ).*(?=\<\/p>)/)[0].split("/").join('-')+'T00:00:00Z';
    //let date = text.match(/(?<=\<p>Unit prices effective as at ).*(?=\<\/p>)/)[0];
    let dateNZ = text.match(/(?<=\<p>Unit prices effective as at ).*(?=\<\/p>)/)[0].split("/");
    let date = dateNZ[2] + "-" + dateNZ[1] + "-" + dateNZ[0] + 'T00:00:00Z';
    //console.log('asdfasfdsadf  fsdfdfdf   saddsf', date);
    // console.log('asdfsadffffffffff', dates.includes(date));        
    if (!dates.includes(date)) {
        let scraper = require('table-scraper');
        // console.log('scrapper');
        result = await scraper
            .get('https://www.amp.co.nz/amp/returns-unit-prices/amp-new-zealand-retirement')
            .then(async function (tableData) {
                //console.log(tableData[0][0]);
                //const result = tableData[0].find( ({ FUND }) => FUND === 'AMP Aggressive Fund' );
                //console.log(result[ 'UNIT PRICE ($)' ]) // { name: 'cherries', quantity: 5 }
                let output = {};
                let payload = {};
                let funds = [];
                let nikko = {};
                let amp = {};
                let asb = {};
                let anz = {};
                nikko.fund = "nikko";
                amp.fund = "amp";
                asb.fund = "asb";
                anz.fund = "anz";
                nikko.percent = 0.26;
                amp.percent = 0.25;
                asb.percent = 0.25;
                anz.percent = 0.24;
                nikko.price = tableData[0].find(({ FUND }) => FUND === 'Nikko AM Growth Fund')['UNIT PRICE ($)'];
                amp.price = tableData[0].find(({ FUND }) => FUND === 'AMP Aggressive Fund')['UNIT PRICE ($)'];
                asb.price = tableData[0].find(({ FUND }) => FUND === 'ASB Growth Fund')['UNIT PRICE ($)'];
                anz.price = tableData[0].find(({ FUND }) => FUND === 'ANZ Growth Fund')['UNIT PRICE ($)'];
                //console.log(anz.price) // { name: 'cherries', quantity: 5 }
                funds.push(nikko);
                funds.push(amp);
                funds.push(asb);
                funds.push(anz);
                payload.date = date;
                payload.funds = funds;
                output.payload = payload;
                doc = JSON.parse(JSON.stringify(output));
                // console.log('sadfsdafsadfsdfsadfsadfsdf', JSON.stringify(payload));
                // Code for inserting into db directly
                // const result = await myColl.insertOne(payload);

                const result = await postToDataAPI("/insertOne", payload);
                return result;
            })
    }
    console.log("Successfully inserted: " + result);
    return result;
}


/****************** // CODE FOR CONNECTING TO DB DIRECTLY

// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://patrickcura1989:PASSWORD@cluster0.f0tw0nk.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function crudToMongoDB(operation, dates) {
    let response = "";
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        let dbo = await client.db("amp"); // database
        let myColl = await dbo.collection("rates"); // collection
        console.log("Successfully connected to MongoDB!");

        if (operation === "retrieve") {
            response = await retrieve(myColl)
        }
        if (operation === "insert") {
            response = await insert(myColl, dates)
        }

    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
    return response;
}

async function retrieve(myColl) {
    let response = [];
    const findResult = await myColl.find();
    for await (const doc of findResult) {
        response.push(doc);
    }
    console.log("Successfully retrieved");
    return response;
}

// Sample code for inserting data into db
// async function insert(myColl) {
//     const doc = { "date": "2021-07-05T00:00:00Z", "funds": [{ "fund": "nikko", "percent": 0.26, "price": "1.60074" }, { "fund": "amp", "percent": 0.25, "price": "4.5079" }, { "fund": "asb", "percent": 0.25, "price": "1.56493" }, { "fund": "anz", "percent": 0.24, "price": "1.63875" }] };
//     const result = await myColl.insertOne(doc);
//     return result;
// }

**/