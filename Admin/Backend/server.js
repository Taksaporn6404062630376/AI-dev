const express = require('express');
const mysql = require('mysql')
const cors = require('cors')
const multer  = require('multer');
const path = require('path'); 

const app = express()
app.use(express.json())
app.use(cors())



const storage = multer.memoryStorage(); 

const upload = multer({ storage: storage });

app.post('/upload', upload.single('image'), function (req, res, next) {
  const file = req.file;

  
  const nextCSIDQuery = 'SELECT CSID + 1 AS NextCSID FROM CSUser ORDER BY CSID DESC LIMIT 1';

  db.query(nextCSIDQuery, (err, results) => {
    if (err) {
      console.error('Error getting the next CSID:', err);
      res.status(500).json({ error: 'Error getting the next CSID from the database' });
    } else {
      
      const nextCSID = results[0] ? results[0].NextCSID : 1;
      console.log('Query results:', results);
    //   const nextCSID = results[0].NextCSID ;
    

      const filename = nextCSID + path.extname(file.originalname);

      // Save 
      const destination = path.join('../frontend/img_test/', filename);
      require('fs').writeFileSync(destination, file.buffer);
    
      console.log(destination)
      console.log('File saved successfully:', filename);
      res.send(destination);

      
    }
  });
})





const db = mysql.createConnection({
    host: "localhost",
    user: 'root',
    password: '',
    database: 'ai'
})

app.get('/' , (re, res) => {
    return res.json("From Backend Side")
})

app.get('/Search', (req, res) => {
    // const sql = "SELECT * FROM transaction"
    // const sql = "SELECT t.Date_time, t.CSGender, t.CSAge, u.CSName AS UserName, e.EmoName AS EmotionName, t.S_Pic, t.L_Pic FROM Transaction t JOIN `CSUser` u ON t.CSID = u.CSID JOIN Emotion e ON t.EmoID = e.EmoID"
    const sql = `
                SELECT
                t.Date_time,
                t.CSGender,
                t.CSAge,
                CASE WHEN t.CSID = 0 THEN 'Unknown' ELSE u.CSName END AS UserName,
                e.EmoName AS EmotionName,
                t.S_Pic,
                t.L_Pic
            FROM
                Transaction t
            LEFT JOIN
                CSUser u ON t.CSID = u.CSID
            JOIN
                Emotion e ON t.EmoID = e.EmoID
            ORDER BY 
                t.Date_time;
                `;
    
    db.query(sql, (err, data) => {
        if(err) return res.json(err);
        return res.json(data)
    })
})


app.post('/Login', (req, res) => {
    const sql = "SELECT * FROM admin WHERE AdUsername = ? AND AdPassword = ? "
    db.query(sql, [req.body.username, req.body.password], (err, data) => {
        if(err) return res.json("err");
        if(data.length > 0){
            return res.json("Login success")
        }else{
            return res.json("No record")
        }
    })
})

app.get('/User', (req, res) => {
    const sql = 'SELECT * FROM `csuser` WHERE 1';
    db.query(sql, (err, data) => {
        if(err) return res.json(err)
        return res.json(data)
    })
})
app.delete('/deleteUser/:userId', (req, res) => {
    const userId = req.params.userId;

    const sql = 'DELETE FROM CSUser WHERE CSID = ?';
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error('Error deleting user:', err);
            res.status(500).json({ message: 'Failed to delete user' });
        } else {
            console.log('User deleted successfully');
            res.status(200).json({ message: 'User deleted successfully' });
        }
    });
});

app.post('/AddUser', (req, res) => {
    const { CSName, role, imgpath } = req.body;
    console.log(req.body)
    const sql = 'INSERT INTO CSUser (CSName, Role, CSImg) VALUES (?, ?, ?)';
  
    db.query(sql, [CSName, role, imgpath], (error, results) => {
      if (error) {
        console.error('Error inserting user:',error);
        res.status(500).json({ message: 'Failed to add user' });
      } else {
        console.log('User added successfully');
        res.status(200).json({ message: 'User added successfully' });
      }
    });
  });
  
  app.get('/Teacher', (req, res) => {
    const sql = "SELECT * FROM `csuser` WHERE Role='teacher'";
    db.query(sql, (err, data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.get('/dashboard', (req, res) => {
    const { csName } = req.query;

    let sql = "SELECT CSID FROM csuser WHERE CSName = ?";
    db.query(sql, [csName], (err, data) => {
        if (err) return res.json(err);

        if (data.length > 0 && typeof data[0].CSID !== 'undefined') {
            const csid = data[0].CSID;
            // ทำสิ่งที่ต้องการกับ csid
            let sqlTransaction = `
            SELECT transaction.Date_time, transaction.EmoID, transaction.CSID, csuser.CSName, emotion.EmoName 
            FROM transaction 
            JOIN csuser ON transaction.CSID = csuser.CSID 
            JOIN emotion ON transaction.EmoID = emotion.EmoID
            WHERE transaction.CSID = ?
            AND (HOUR(transaction.Date_time) <= 10 OR HOUR(transaction.Date_time) <= 14)
        `;
        db.query(sqlTransaction, [csid], (err, transactionData) => {
            if (err) return res.json(err);

            const dayOfWeekFromDate = (date) => {
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                const d = new Date(date);
                return days[d.getDay()];
            };

            const weeklyData = transactionData.reduce((acc, item) => {
                const day = dayOfWeekFromDate(item.Date_time);
                const emotion = item.EmoName;

                if (!acc[emotion]) {
                    acc[emotion] = {
                        Monday: 0,
                        Tuesday: 0,
                        Wednesday: 0,
                        Thursday: 0,
                        Friday: 0,
                        Saturday: 0,
                        Sunday: 0
                    };
                }

                acc[emotion][day] += 1;

                return acc;
            }, {});

            const emotions = ['Happy', 'Sad', 'Angry', 'Surprised', 'Disgusted', 'Fearful', 'Neutral'];

            const series = emotions.map(emotion => ({
                name: emotion,
                data: Object.values(weeklyData[emotion] || {})
            }));
            

            const options = {
                chart: {
                    type: 'bar',
                    height: 350,
                    stacked: true,
                },
                plotOptions: {
                    bar: {
                        horizontal: true,
                    },
                },
                stroke: {
                    width: 1,
                    colors: ['#fff']
                },
                title: {
                    text: `Teacher Emotions Before Teaching`,
                },
                xaxis: {
                    categories: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                },
                tooltip: {
                    y: {
                        formatter: function (val) {
                            return val + " times"
                        }
                    }
                },
                fill: {
                    opacity: 1
                },
                legend: {
                    position: 'top',
                    horizontalAlign: 'left',
                    offsetX: 40
                },
                colors: ['#07CAE0', '#775DD0', '#FF4560', '#FEB019', '#18EF55', '#035195', '#FF4CD5']
            };


            const stackedBarChartData = { series, options };

            return res.json(stackedBarChartData);
        });
        } else {
            // กรณี CSName ไม่มีในฐานข้อมูล หรือข้อมูลไม่ครบถ้วน
            console.log('CSID is not defined or has an undefined value');
        }


    });
});

app.get('/dashout', (req, res) => {
    const { csName } = req.query;

    let sql = "SELECT CSID FROM csuser WHERE CSName = ?";
    db.query(sql, [csName], (err, data) => {
        if (err) return res.json(err);

        if (data.length > 0 && typeof data[0].CSID !== 'undefined') {
            const csid = data[0].CSID;
            let sqlTransaction = `
            SELECT transaction.Date_time, transaction.EmoID, transaction.CSID, csuser.CSName, emotion.EmoName 
            FROM transaction 
            JOIN csuser ON transaction.CSID = csuser.CSID 
            JOIN emotion ON transaction.EmoID = emotion.EmoID
            WHERE transaction.CSID = ?
            AND (HOUR(transaction.Date_time) > 10 OR HOUR(transaction.Date_time) > 14)
            
            `;

            db.query(sqlTransaction, [csid], (err, transactionData) => {
                if (err) return res.json(err);
            const dayOfWeekFromDate = (date) => {
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                const d = new Date(date);
                return days[d.getDay()];
            };

            const weeklyData = transactionData.reduce((acc, item) => {
                const day = dayOfWeekFromDate(item.Date_time);
                const emotion = item.EmoName;

                if (!acc[emotion]) {
                    acc[emotion] = {
                        Monday: 0,
                        Tuesday: 0,
                        Wednesday: 0,
                        Thursday: 0,
                        Friday: 0,
                        Saturday: 0,
                        Sunday: 0
                    };
                }

                acc[emotion][day] += 1;

                return acc;
            }, {});

            const emotions = ['Happy', 'Sad', 'Angry', 'Surprised', 'Disgusted', 'Fearful', 'Neutral'];

            const series = emotions.map(emotion => ({
                name: emotion,
                data: Object.values(weeklyData[emotion] || {})
            }));
            

            const options = {
                chart: {
                    type: 'bar',
                    height: 350,
                    stacked: true,
                },
                plotOptions: {
                    bar: {
                        horizontal: true,
                    },
                },
                stroke: {
                    width: 1,
                    colors: ['#fff']
                },
                title: {
                    text: `Teacher Emotions After Teaching`,
                },
                xaxis: {
                    categories: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                },
                tooltip: {
                    y: {
                        formatter: function (val) {
                            return val + " times"
                        }
                    }
                },
                fill: {
                    opacity: 1
                },
                legend: {
                    position: 'top',
                    horizontalAlign: 'left',
                    offsetX: 40
                },
                colors: ['#07CAE0', '#775DD0', '#FF4560', '#FEB019', '#18EF55', '#035195', '#FF4CD5']
            };


            const stackedBarChartData = { series, options };

            return res.json(stackedBarChartData);
        });
        } else {
            // กรณี CSName ไม่มีในฐานข้อมูล หรือข้อมูลไม่ครบถ้วน
            console.log('CSID is not defined or has an undefined value');
        }


    });
});





// app.post('/createAd', (req, res) => {
//     const { AdName, AdUsername, AdPassword } = req.body;
  
//     const sql = 'INSERT INTO admin (AdName, AdUsername, AdPassword) VALUES (?, ?, ?)';
//     db.query(sql, [AdName, AdUsername, AdPassword], (err, result) => {
//       if (err) throw err;
//       console.log('Ad created:', result);
//       res.send('Ad created successfully');
//     });
//   });

app.post('/insertSchedule', async (req, res) => {
    const { data, courseDetails } = req.body;

    try {
        for (const schedule of data) {
            const {
                title,
                startDate,
                endDate
            } = schedule;

            const [CName, CID] = title.split(' ');

            const query = `
                INSERT IGNORE INTO schedule (CID, CName, Day, StartTime, EndTime, semester, academicYear, CSID)
                SELECT 
                    ?, -- CID
                    ?, -- CName
                    DAYOFWEEK(?)-1, -- Day (assuming DAYOFWEEK returns 1 for Sunday)
                    TIME(?), -- StartTime
                    TIME(?), -- EndTime
                    ?, -- semester
                    ?, -- academicYear
                    csuser.CSID -- CSID
                FROM 
                    csuser 
                WHERE 
                    csuser.CSName = ?
            `;

            const dateMap = {
                mon: "2024-03-04",
                tue: "2024-03-05",
                wed: "2024-03-06",
                thu: "2024-03-07",
                fri: "2024-03-08",
                sat: "2024-03-09",
            };

            const values = [
                CID, // CID
                CName, // CName
                dateMap[new Date(startDate).toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase()], // Day
                new Date(startDate).toLocaleString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Bangkok' }), // StartTime
                new Date(endDate).toLocaleString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Bangkok' }), // EndTime                   
                courseDetails.semester, // semester
                courseDetails.academicYear, // academicYear
                courseDetails.Tname, // CSID
            ];

            await db.query(query, values);
        }

        console.log('Schedules inserted successfully');
        res.status(200).json({ message: 'Schedules inserted successfully' });
    } catch (error) {
        console.error('Error inserting schedules:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.listen(8081, () => {
    console.log("listening");
})