const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const axios = require('axios');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/credentials', (req, res) => {
    const username = process.env.TRACKERRMS_USERNAME;
    const password = process.env.TRACKERRMS_PASSWORD;

    if (!username || !password) {
        return res.status(500).json({
            error: 'Failed to load credentials from environment variables',
        });
    }

    res.json({
        username: username,
        password: password,
    });
});

app.post('/api/createResource', async (req, res) => {
    const formData = req.body;
    formData.trackerrms.createResource.credentials = {
        username: process.env.TRACKERRMS_USERNAME,
        password: process.env.TRACKERRMS_PASSWORD,
    };

    try {
        // First API call to create the resource
        const resourceResponse = await axios.post(
            'https://evoapius.tracker-rms.com/api/widget/createResource',
            formData,
            { headers: { 'Content-Type': 'application/json' } }
        );

        const recordId = resourceResponse.data.recordId;

        // Prepare data for createActivity API call
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];
        const formattedTime = currentDate.toTimeString().split(' ')[0];

        const activityData = {
            trackerrms: {
                createActivity: {
                    activity: {
                        subject: 'New Activity',
                        type: 'Email',
                        date: formattedDate,
                        time: formattedTime,
                        status: 'Completed',
                        priority: 'Medium',
                        contactType: 'Outbound',
                        note: 'Associated with new resource creation',
                        linkRecordType: 'R',
                        linkRecordId: recordId,
                    },
                },
            },
        };

        // Second API call to create activity
        const authHeader = 'Basic ' + Buffer.from(
            `${process.env.TRACKERRMS_USERNAME}:${process.env.TRACKERRMS_PASSWORD}`
        ).toString('base64');

        const activityResponse = await axios.post(
            'https://evoapius.tracker-rms.com/api/widget/createActivity',
            activityData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: authHeader,
                },
            }
        );

        res.status(200).json({
            resource: resourceResponse.data,
            activity: activityResponse.data,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
