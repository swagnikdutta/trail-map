const express = require('express');
const parseString = require('xml2js').parseString;
const fs = require('fs');
const _ = require('lodash');

const app = express();
const port = process.env.PORT || 3000;
const xmlString = fs.readFileSync('./data.xml', {encoding: 'utf-8'})

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    parseString(xmlString, function (err, result) {
        if(err){
            return res.send(`Error: ${err}`)
        }

        let dataPoints = _.get(result, 'gpx.trk[0].trkseg[0].trkpt', []),
            justCoordinates  = dataPoints.map(elem => elem['$']),
            totalDistance = 0,
            maxSpeed = 0,
            avgSpeed = 0,
            totalMovingTime = 0,
            maxElevation = 0, 
            minElevation = 99999;

        for(let i=1; i<dataPoints.length; i++){
            let lat1 = _.get(dataPoints[i], '$.lat', '0') * 1, 
                lon1 = _.get(dataPoints[i], '$.lon', '0') * 1,
                lat2 = _.get(dataPoints[i-1], '$.lat', '0') * 1, 
                lon2 = _.get(dataPoints[i-1], '$.lon', '0') * 1;
    
            let distance = getDistanceBetweenPoints(lat1, lon1, lat2, lon2);
            totalDistance += distance;
    
            let time = _.get(dataPoints[i], 'time[0]', ''),
                prevTime = _.get(dataPoints[i-1], 'time[0]', ''),
                timeElapsed = (new Date(time) - new Date(prevTime)) / 36e5, // hrs
                elevation = dataPoints[0].ele[0];

            let speed = distance / timeElapsed;     // Km/hr
            maxSpeed = Math.max(maxSpeed, speed);
            avgSpeed += speed;
            totalMovingTime += (timeElapsed * 3600) > 5 ? timeElapsed : 0; // if timeElapsed is more than 5 seconds, then considering it
            maxElevation = Math.max(maxElevation, elevation);
            minElevation = Math.min(minElevation, elevation);
        }

        res.render('index.ejs', {
            justCoordinates,
            maxSpeed,
            avgSpeed: avgSpeed / dataPoints.length,
            totalDistance,
            totalMovingTime,
            elevationGained: maxElevation - minElevation
        });
    });
});

app.listen(port, () => {
	console.log('Server is running on port: ' + port);
});

// utility functions
const deg2rad = deg => deg * (Math.PI/180);

const getDistanceBetweenPoints = (lat1, lon1, lat2, lon2) => {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1); 
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
}

module.exports = app;



  