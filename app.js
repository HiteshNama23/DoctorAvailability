const express = require('express');
const fs = require('fs');
const { DateTime } = require('luxon');

const app = express();

// Load doctor availability from JSON file
const availabilityData = JSON.parse(fs.readFileSync('Availability.json'));

function getNextAvailableSlot(requestedDate, requestedTime) {
    const requestedDateTime = DateTime.fromFormat(requestedDate + ' ' + requestedTime, 'yyyy-MM-dd HH:mm');

    // Get the availability timings for the requested weekday
    const weekday = requestedDateTime.toFormat('EEEE').toLowerCase();
    const availabilityTimings = availabilityData.availabilityTimings[weekday];

    if (!availabilityTimings || availabilityTimings.length === 0) {
        // Doctor is on leave for the requested weekday
        return { date: requestedDate, time: availabilityTimings[0].start };
    }

    for (const timing of availabilityTimings) {
        const startDateTime = DateTime.fromFormat(requestedDate + ' ' + timing.start, 'yyyy-MM-dd HH:mm');
        const endDateTime = DateTime.fromFormat(requestedDate + ' ' + timing.end, 'yyyy-MM-dd HH:mm');

        if (startDateTime <= requestedDateTime && requestedDateTime <= endDateTime) {
            // Doctor is available for the requested date and time
            return null;
        } else if (requestedDateTime < startDateTime) {
            // Next available slot is the start time of the first available slot after the requested time
            return { date: requestedDate, time: startDateTime.toFormat('HH:mm') };
        }
    }

    // If no available slot is found for the requested date, find the next available date and time
    const nextAvailableDate = requestedDateTime.plus({ days: 1 }).toFormat('yyyy-MM-dd');
    const nextAvailableWeekday = DateTime.fromFormat(nextAvailableDate, 'yyyy-MM-dd').toFormat('EEEE').toLowerCase();
    const nextAvailableTimings = availabilityData.availabilityTimings[nextAvailableWeekday];
    const nextAvailableSlot = nextAvailableTimings[0].start;

    return { date: nextAvailableDate, time: nextAvailableSlot };
}

app.get('/doctor-availability', (req, res) => {
    const requestedDate = req.query.date;
    const requestedTime = req.query.time;

    if (!requestedDate || !requestedTime) {
        return res.status(400).json({ error: 'Date and time parameters are required.' });
    }

    const nextAvailableSlot = getNextAvailableSlot(requestedDate, requestedTime);

    if (nextAvailableSlot) {
        return res.json({
            isAvailable: false,
            nextAvailableSlot: nextAvailableSlot
        });
    } else {
        return res.json({ isAvailable: true });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
