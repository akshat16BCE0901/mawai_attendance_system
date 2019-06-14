var express = require('express');
var app = express();
var things = require('./things.js');
var bodyParser = require("body-parser");
var request = require("request");
var mongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/locus";
var nodemailer = require('nodemailer');

var port  = process.env.PORT || 3000;

app.set("view-engine","ejs");
app.use(express.static(__dirname+"/public"));
app.use(
    bodyParser.urlencoded({
      extended: true
    }));
app.get('/',function(req,res)
{
    res.render("landingpage.ejs");
});

app.post('/loginvalidate',function(req,res)
{
    var params = req.body;
    var phone = params.phone;
    var password = params.password;
    var obj = {
        "phone": phone,
        "password":password
    }
    mongoClient.connect(url,function(err,db)
    {
        if(err) throw err;
        var dbo = db.db("locus");
        dbo.collection("user_details").find(obj).toArray(function(err,resp)
        {
            if(err) throw err;
            if(resp.length>0)
            {
                res.render("register.ejs",{data: {"empid":resp[0].name}});
            }
            else{
                res.render("landingpage.ejs");
            }
        });
    });
});

app.post('/register',function(req,res)
{
    var params = req.body;
    var name = params.name;
    var email = params.email;
    var dob = params.dob;
    var gender = params.gender;
    var phone = params.phone;
    var password = params.password;
    var obj = {

        "name":name,
        "email":email,
        "dateofbirth":dob,
        "gender":gender,
        "phone":phone,
        "password":password
    };
    mongoClient.connect(url,{useNewUrlParser: true},function(err,db)
    {
        if(err) throw err;
        var dbo = db.db("locus");
        dbo.collection("user_details").find({"phone":phone}).toArray(function(err,resp)
        {
            if(err) throw err;
            if(resp.length>0)
            {
                res.write("Entry already present against name - ");
                // res.write(JSON.stringify(resp));
                res.write(resp[0].name)
                res.end();
            }
            else{
                dbo.collection("user_details").insertOne(obj,function(err,result)
                {
                    if(err) throw err;
                    res.render("register.ejs",{"data": {"empid":obj.name}});
                });
            }
        });
        
    });
});

app.post('/viewbyid',function(req,res)
{
    var dataitems = req.body;
    console.log(dataitems);
    var empid = dataitems.empid;
    mongoClient.connect(url,{useNewUrlParser: true},function(err,db)
    {
        if(err) throw err;
        var dbo = db.db("locus");
        var query = {"empid" : empid};
        console.log(query);
        dbo.collection("attendance").find(query).toArray(function(err,result)
        {
            if(err) throw err;
            dbo.collection("attendance").distinct("empid",{},function(err,ress)
            {
                if(err) throw err;
                console.log(ress);
                console.log(result);
                res.render("attendancehistory.ejs",{data : result,"status":"specific","names":ress});
            });
        });
    });
});

app.get('/login',function(req,res)
{
    res.render("login.ejs");
});

app.get('/viewattendance',function(req,res)
{
    mongoClient.connect(url,{useNewUrlParser: true},function(err,db)
    {
        if(err) throw err;
        var dbo = db.db("locus");
        
        dbo.collection("attendance").find({}).toArray(function(err,result)
        {
            if(err) throw err;
            dbo.collection("attendance").distinct("empid",{},function(err,ress)
            {
                if(err) throw err;
                console.log(ress);
                res.render("attendancehistory.ejs",{data : result,"status":"all","names":ress});
            });
        });
    });
});

app.post('/submitlocation',function(req,res)
{
    var params = req.body;
    var name = params.name;
    var lat = params.lat;
    var long= params.long;
    var currentTime = new Date();
    var currentOffset = currentTime.getTimezoneOffset();
    var ISTOffset = 330;
    var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset)*60000);
    var hoursIST = ISTTime.getHours();
    if(parseInt(hoursIST)<10)
    {
        hoursIST = "0"+hoursIST.toString();
    }
    var minutesIST = ISTTime.getMinutes();
    if(parseInt(minutesIST)<10)
    {
        minutesIST = "0"+minutesIST.toString();
    }
    var daynow = new Date().getDate();
    var monthnow = new Date().getMonth()+1;
    var yearnow = new Date().getFullYear();
    var timenow = hoursIST + ":" + minutesIST;
    var fulldatenow = daynow+"/"+monthnow+"/"+yearnow;
    var locationName = "";
    var url2 = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" +lat + "," +long +"&sensor=true&key=AIzaSyACjEFG5Hufa0S1NlDL1IH0bphLn334Ciw";
    request(url2, function(error, response, body) {
            if (!error && response.statusCode == 200) 
            {
                var locationDetails = JSON.parse(body);
                locationName = locationDetails["results"][0]["formatted_address"];
                var obj = {
                    empid : name,
                    curr_lat : lat,
                    curr_long : long,
                    punch_date : fulldatenow,
                    punch_time : timenow,
                    locationAddress : locationName
                };
                mongoClient.connect(url,{useNewUrlParser: true},function(err,db)
                {
                    if(err) throw err;
                    var dbo = db.db("locus");
                    dbo.collection("attendance").insertOne(obj,function(err,response)
                    {
                        if(err) throw err;
                        var transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                              user: 'akshat.singhal2016@vitstudent.ac.in',
                              pass: 'Akshat@1998'
                            }
                          });
                          
                          var mailOptions = {
                            from: 'akshat.singhal2016@vitstudent.ac.in',
                            to: 'akshat.yash@rediffmail.com',
                            subject: 'Locus App',
                            html: '<!DOCTYPE html><html><body><h4 style="font-size: 14px; font-weight: bold;">Congratulations, attendance has been punched. Details are - </h4><table cellpadding="10px" border="1" style="border-collapse: collapse;"><tr><th style="font-weight: bold;text-align: center;padding: 10px;" colspan="5">Employee ID :'+obj.empid+' </th></tr><tr><th style="font-weight: bold;padding: 10px;">Latitude</th><th style="font-weight: bold;padding: 10px;">Longitude</th><th style="font-weight: bold;padding: 10px;">Date</th><th style="font-weight: bold;padding: 10px;">Time</th><th style="font-weight: bold;padding: 10px;">Address</th></tr><tr><td style="padding: 10px;">'+obj.curr_lat+'</td><td style="padding: 10px;">'+obj.curr_long+'</td><td style="padding: 10px;">'+obj.punch_date+'</td><td style="padding: 10px;">'+obj.punch_time+'</td><td style="padding: 10px;">'+obj.locationAddress+'</td></tr></table></body></html>'
                          };
                          
                          transporter.sendMail(mailOptions, function(error, info){
                            if (error) {
                              console.log(error);
                            } else {
                              console.log('Email sent: ' + info.response);
                            }
                          });
                        res.redirect("http://localhost:3000/viewattendance");
                    });
                });
            }
        });

});
app.use('/things',things);
app.listen(port,function()
{
    console.log("Server listening");
});