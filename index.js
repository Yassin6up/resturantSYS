require('dotenv').config();
const express = require("express");
const mysql = require("mysql");
const crypto = require("crypto");
const https = require("follow-redirects").https;
const qs = require("querystring");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 5000;
const multer = require("multer");
const http = require('http');
const cron = require('node-cron');
const moment = require('moment');
const { Expo } = require('expo-server-sdk');


const expo = new Expo();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up multer for file uploadss

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads", "temp");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});



const upload = multer({ storage });




const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});


db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
    return;
  }
  console.log('Connected to MySQL database');
});


const sendVerificationCode = async (to, message) => {
    const baseUrl = 'http://82.212.81.40:8080/websmpp/websms';
    const params = new URLSearchParams({
        user: 'JbuyApp1',
        pass: '429J@NewY',
        sid: 'Jbuy.App',
        mno: to,
        type: '4', // Unicode for Arabic messages
        text: message
    });

    const url = `${baseUrl}?${params.toString()}`;
    
    try {
        const response = await fetch(url);
        const body = await response.text();
        
        // Check if the response indicates success
        if (response.ok) {
            return body;
        } else {
            throw new Error(`SMS API Error (${response.status}): ${body}`);
        }
    } catch (error) {
        throw new Error(`Failed to send SMS: ${error}`);
    }
};




app.get("/",(req , res)=>{
    res.send("work" )
})



const logAdminAction = ({ adminToken, actionType, placeId, actionMessage }, callback) => {
    // 1. Validate input parameters
    if (!adminToken || !actionType || !placeId || !actionMessage) {
        return callback(new Error('جميع الحقول مطلوبة')); // All fields are required
    }

    // 2. Fetch admin details using the adminToken
    const fetchAdminQuery = 'SELECT id, name FROM admins WHERE token = ?';
    db.query(fetchAdminQuery, [adminToken], (fetchErr, fetchResults) => {
        if (fetchErr) {
            console.error('Database error (fetch admin):', fetchErr);
            return callback(new Error('فشل في جلب بيانات المدير')); // Failed to fetch admin details
        }

        if (fetchResults.length === 0) {
            return callback(new Error('المدير غير موجود')); // Admin not found
        }

        const admin = fetchResults[0]; // Get the first matching admin
        const adminId = admin.id;
        const adminName = admin.name;

        // 3. Insert the admin action into the history table
        const insertQuery = `
            INSERT INTO admin_actions_history 
            (admin_id, admin_name, action_type, place_id, action_message)
            VALUES (?, ?, ?, ?, ?)
        `;

        const values = [adminId, adminName, actionType, placeId, actionMessage];

        db.query(insertQuery, values, (insertErr, insertResults) => {
            if (insertErr) {
                console.error('Database error (insert action):', insertErr);
                return callback(new Error('فشل في تسجيل عمل المدير')); // Failed to log admin action
            }

            // Return success
            callback(null, {
                success: true,
                message: 'تم تسجيل عمل المدير بنجاح', // Admin action logged successfully
                actionId: insertResults.insertId // Return the ID of the inserted action
            });
        });
    });
};

const sendNotification = ({ title, message, redirectId, redirectType, userId, fromId }, callback) => {
    // Validate input parameters
    if (!title || !message || !userId || !fromId || !redirectId || !redirectType) {
        return callback(new Error('Missing required parameters.'));
    }

    // Fetch user's notification token
    const fetchUserQuery = 'SELECT id, notificationToken FROM users WHERE id = ?';
    db.query(fetchUserQuery, [userId], (fetchErr, fetchResults) => {
        if (fetchErr) {
            console.error('Database error fetching user:', fetchErr);
            return callback(new Error('Failed to fetch user.'));
        }
        if (fetchResults.length === 0) {
            return callback(new Error('User not found.'));
        }

        const user = fetchResults[0];

        // Send push notification if token exists
        if (user.notificationToken) {
            const notification = {
                to: user.notificationToken,
                sound: 'default',
                title,
                body: message,
                data: { redirectType, redirectId }
            };
            expo.sendPushNotificationsAsync([notification])
                .then(() => {
                    console.log('Notification sent successfully.');
                })
                .catch((expoErr) => {
                    console.error('Expo error:', expoErr);
                    return callback(new Error('Failed to send notification.'));
                });
        }

        // Determine the correct column for redirection
        const column = redirectType === 'post' ? 'placeId' :
                       redirectType === 'user' ? 'profileId' : 'profileId';

        // Insert notification into the database
        const insertQuery = `
            INSERT INTO notifications 
            (user_id, from_id, title, message, ${column})
            VALUES (?, ?, ?, ?, ?)
        `;
        db.query(insertQuery, [userId, fromId, title, message, redirectId || null], (insertErr, insertResults) => {
            if (insertErr) {
                console.error('Database error inserting notification:', insertErr);
                return callback(new Error('Failed to insert notification.'));
            }

            // Return success
            callback(null, {
                success: true,
                sent: user.notificationToken ? 1 : 0,
                message: 'Notification processed successfully'
            });
        });
    });
};

cron.schedule('0 0 * * *', () => { // Runs every midnight
    const sql = `
        UPDATE places 
        SET sponsored = 0 
        WHERE vipExpiresAt <= NOW() AND sponsored = 1`;

    db.query(sql, (err, result) => {
        if (err) console.error('Error updating expired VIP places:', err);
        else console.log('Expired VIP places updated successfully.');
    });
});

app.post('/send-notification', (req, res) => {
    const { title, body: message, redirectId, redirectType, userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'Invalid user IDs' });
    }

    // 1. First get all user notification tokens
    db.query(
        'SELECT id, notificationToken FROM users WHERE id IN (?)',
        [userIds],
        async (userErr, users) => {
            if (userErr) {
                console.error('Database error:', userErr);
                return res.status(500).json({ error: 'Failed to fetch users' });
            }

            // 2. Prepare and send notifications
            try {
                const validTokens = users
                    .filter(user => user.notificationToken)
                    .map(user => ({
                        to: user.notificationToken,
                        sound: 'default',
                        title,
                        body: message,
                        data: { redirectType, redirectId }
                    }));

                if (validTokens.length > 0) {
                    await expo.sendPushNotificationsAsync(validTokens);
                }

                // 3. Insert notifications into database
                const column = redirectType === 'post' ? 'placeId' : 
                            redirectType === 'user' ? 'profileId' : "profileId";

                const insertQuery = `
                    INSERT INTO notifications 
                    (user_id, title, message, ${column})
                    VALUES ?
                `;

                const values = userIds.map(userId => [
                    userId,
                    title,
                    message,
                    redirectId || null
                ]);

                db.query(insertQuery, [values], (insertErr, result) => {
                    if (insertErr) {
                        console.error('Insert error:', insertErr);
                        return res.status(500).json({ error: insertErr});
                    }

                    res.json({
                        success: true,
                        sent: validTokens.length,
                        total: userIds.length,
                        message: `Notifications processed successfully`
                    });
                });

            } catch (expoErr) {
                console.error('Expo error:', expoErr);
                res.status(500).json({ error: 'Failed to send push notifications' });
            }
        }
    );
});



app.post('/toggle_blocked/:id', (req, res) => {
  const userId = req.params.id;

  // Query to get the current 'blocked' value
  db.query('SELECT blocked FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBlocked = results[0].blocked;
    const newBlockedValue = currentBlocked === 1 ? 0 : 1; // Toggle between 0 and 1

    // Update the 'blocked' value
    db.query('UPDATE users SET blocked = ? WHERE id = ?', [newBlockedValue, userId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error updating user' });
      }

      // Return the updated value of 'blocked'
      res.json({ blocked: newBlockedValue });
    });
  });
});


app.post('/toggle_trustable/:id', (req, res) => {
  const userId = req.params.id;

  // Fetch the current 'trustable' value for the user
  db.query('SELECT trustable FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentTrustable = results[0].trustable;
    const newTrustableValue = currentTrustable === 1 ? 0 : 1; // Toggle between 1 and 0

    // Update the 'trustable' value
    db.query('UPDATE users SET trustable = ? WHERE id = ?', [newTrustableValue, userId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error updating user' });
      }

      // Return the updated value of 'trustable'
      res.json({ trustable: newTrustableValue });
    });
  });
});


app.get('/api/notifications/:userId', (req, res) => {
    const { userId } = req.params;
    const query = `
        SELECT n.*, u.name, u.phone, u.trustable, u.picture_url , u.image_name
        FROM notifications n
        JOIN users u ON n.from_id = u.id
        WHERE n.user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results.reverse());
    });
});



// Mark a notification as read
app.post('/api/notifications/read/:id', (req, res) => {
    const { id } = req.params;
    db.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'Notification marked as read' });
    });
});


app.delete('/api/notifications/:id', (req, res) => {
    const notificationId = req.params.id;
    
    // Validate ID format first
    if (!Number.isInteger(Number(notificationId))) {
        return res.status(400).json({ error: 'Invalid notification ID format' });
    }

    const query = 'DELETE FROM notifications WHERE id = ?';
    
    db.query(query, [notificationId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ 
            success: true,
            message: 'Notification deleted successfully',
            deletedId: notificationId
        });
    });
});

app.get('/api/notifications/unread/:userId', (req, res) => {
  const userId = req.params.userId;

  // SQL query to count unread notifications for the user
  const query = `
    SELECT COUNT(*) AS unreadCount
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching unread notifications:', err);
      return res.status(500).json({ error: 'Failed to fetch unread notifications' });
    }

    // Send the unread notifications count back to the frontend
    res.json({ unreadCount: results[0].unreadCount });
  });
});


app.get('/user/blocked-status/:userId', (req, res) => {
  const userId = req.params.userId;

  // Query to get the blocked value from the users table
  const query = 'SELECT blocked FROM users WHERE session_token = ?';

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching blocked status:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const blocked = results[0].blocked;
    res.json({ userId, blocked });
  });
});


app.get("/server/status",(req , res)=>{
    res.json({message : "work"})
})

app.get("/test/sms", async (req, res) => {
    try {
        const response = await sendVerificationCode("+962782950000", "This is a test message!");
        const parsedResponse = response // Correctly parsing the response
        res.json({ success: true, response: parsedResponse });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});



app.post('/api/make-vip', (req, res) => {
    const { placeId, duration, adminToken } = req.body;

    // Validate placeId and duration
    if (!placeId || !duration) {
        return res.status(400).json({ error: 'Place ID and duration are required.' });
    }

    let vipExpiresAt;
    let arabicTime;

    // Handle multiple durations using a switch statement
    switch (duration) {
        case '24h':
            vipExpiresAt = moment().add(24, 'hours').format('YYYY-MM-DD HH:mm:ss');
            arabicTime = "24 ساعة";
            break;
        case '1week':
            vipExpiresAt = moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss');
            arabicTime = "اسبوع";
            break;
        case '15days':
            vipExpiresAt = moment().add(15, 'days').format('YYYY-MM-DD HH:mm:ss');
            arabicTime = "15 يوما";
            break;
        case '30days':
            vipExpiresAt = moment().add(30, 'days').format('YYYY-MM-DD HH:mm:ss');
            arabicTime = "30 يوم";
            break;
        default:
            return res.status(400).json({ error: 'Invalid subscription duration.' });
    }

    // 1. Fetch the owner_id of the place
    const fetchOwnerQuery = 'SELECT owner_id FROM places WHERE id = ?';
    db.query(fetchOwnerQuery, [placeId], (fetchErr, fetchResults) => {
        if (fetchErr) {
            console.error('Database error:', fetchErr);
            return res.status(500).json({ error: 'Failed to fetch place owner.' });
        }

        if (fetchResults.length === 0) {
            return res.status(404).json({ error: 'Place not found.' });
        }

        const ownerId = fetchResults[0].owner_id;

        // 2. Update the place with the selected subscription
        const updateQuery = `
            UPDATE places 
            SET sponsored = 1, vipExpiresAt = ? 
            WHERE id = ?`;
        
        db.query(updateQuery, [vipExpiresAt, placeId], (updateErr, updateResults) => {
            if (updateErr) {
                console.error('Database error:', updateErr);
                return res.status(500).json({ error: 'Failed to update place.' });
            }

            // 3. Fetch admin details using the adminToken
            const fetchAdminQuery = 'SELECT id, name FROM admins WHERE token = ?';
            db.query(fetchAdminQuery, [adminToken], (adminErr, adminResults) => {
                if (adminErr) {
                    console.error('Database error (fetch admin):', adminErr);
                    return res.status(500).json({ error: 'Failed to fetch admin details.' });
                }

                if (adminResults.length === 0) {
                    return res.status(404).json({ error: 'Admin not found.' });
                }

                const admin = adminResults[0];
                const adminId = admin.id;
                const adminName = admin.name;

                // 4. Log the admin action
                const actionType = 'ترقية الاعلان';
                const actionMessage = `تمت ترقية الاعلان رقم ${placeId} لمدة ${arabicTime}`;

                const insertActionQuery = `
                    INSERT INTO admin_actions_history 
                    (admin_id, admin_name, action_type, place_id, action_message)
                    VALUES (?, ?, ?, ?, ?)
                `;

                db.query(insertActionQuery, [adminId, adminName, actionType, placeId, actionMessage], (insertErr, insertResults) => {
                    if (insertErr) {
                        console.error('Database error (insert action):', insertErr);
                        return res.status(500).json({ error: 'Failed to log admin action.' });
                    }

                    // 5. Send a notification to the owner
                    const notificationData = {
                        title: "ترقية الاعلان",
                        message: `تمت ترقية اعلانك رقم ${placeId} لمدة ${arabicTime}`,
                        redirectId: placeId,
                        redirectType: "post",
                        userId: ownerId, // ID of the user receiving the notification
                        fromId: 1 // ID of the user who triggered the notification (e.g., admin)
                    };

                    sendNotification(notificationData, (notifyErr, notifyResult) => {
                        if (notifyErr) {
                            console.error('Error sending notification:', notifyErr);
                        } else {
                            console.log('Notification sent successfully:', notifyResult);
                        }

                        // 6. Return success response
                        res.json({
                            success: true,
                            message: 'Place is now VIP!',
                            vipExpiresAt: vipExpiresAt
                        });
                    });
                });
            });
        });
    });
});

app.get('/api/admin/getData', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extract token from header

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check if the token exists in the admins table
  db.query('SELECT * FROM admins WHERE token = ?', [token], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(403).json({ message: 'Invalid session' });
    }

    res.status(200).json({ user: results[0] });
  });
});





app.get('/api/admin-actions/:placeId', (req, res) => {
    const placeId = req.params.placeId;

    // Query to fetch admin actions for the given place_id
    const fetchActionsQuery = `
        SELECT id, admin_id, admin_name, action_type, action_message, action_time 
        FROM admin_actions_history 
        WHERE place_id = ?
        ORDER BY action_time DESC
    `;

    db.query(fetchActionsQuery, [placeId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch admin actions.' });
        }

        // Return the admin actions
        res.status(200).json({
            success: true,
            actions: results
        });
    });
});



app.get('/api/subscriptions', (req, res) => {
    const sql = 'SELECT * FROM subscriptions';

    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).send('Error fetching subscriptions.');
        }
        res.json(result); // Send the result (subscriptions) as a JSON response
    });
});


app.post("/register", (req, res) => {
    const { name, phone, password, notificationToken, accountType } = req.body;
    if (!name || !phone || !password) {
        return res.status(400).json({
            message: "الاسم ورقم الهاتف وكلمة المرور مطلوبة",
        });
    }
    
    

    // Normalize phone number
    const normalizedPhone = phone.replace(/^\+9620/, "+962");

    const token = crypto.randomBytes(64).toString("hex");
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const message = `رمز التحقق الخاص بك هو ${verificationCode}`;

    // Check if phone number already exists
    const sqlCheck = "SELECT * FROM users WHERE phone = ?";
    db.query(sqlCheck, [normalizedPhone], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "خطأ في الخادم الداخلي", error: err });
        }

        if (result.length > 0) {
            return res.status(400).json({ message: "رقم الهاتف مستخدم بالفعل" });
        }

        // Insert the new user

         const sqlInsert = `
        INSERT INTO users (
            name, 
            phone, 
            password, 
            phone_verified, 
            session_token, 
            notificationToken, 
            accountType,
            limitPosts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 
            CASE 
                WHEN ? = 'business' THEN 100 
                ELSE DEFAULT(limitPosts) 
            END
        )
    `;

    // Single parameters array
    const params = [
        name,
        normalizedPhone,
        password,
        false,
        token,
        notificationToken || null,
        accountType || "personal",
        accountType || "personal" // Repeat for CASE condition
    ];
        
        db.query(sqlInsert, params, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "خطأ في الخادم الداخلي", error: err });
            }

            // Fetch the newly inserted user
            const sqlSelect = "SELECT * FROM users WHERE id = ?";
            db.query(sqlSelect, [result.insertId], (err, userResult) => {
                if (err) {
                    return res.status(500).json({ message: "خطأ في الخادم الداخلي", error: err });
                }

                const registeredUser = userResult[0];

                // Send verification code
                sendVerificationCode(normalizedPhone, message)
                    .then(() => {
                        const sqlVerifyInsert = "INSERT INTO verifications (phone, code) VALUES (?, ?)";
                        db.query(sqlVerifyInsert, [normalizedPhone, verificationCode], (err) => {
                            if (err) {
                                return res.status(500).json({ message: "خطأ في الخادم الداخلي", error: err });
                            }

                            // If notificationToken is provided, trigger notification function
                            if (notificationToken) {
                                sendBetaNotification(registeredUser.id, notificationToken);
                            }

                            res.status(200).json({ message: "تم تسجيل المستخدم بنجاح.", user: registeredUser });
                        });
                    })
                    .catch((error) => {
                        res.status(500).json({ message: "فشل في إرسال رمز التحقق", error: error.message });
                    });
            });
        });
    });
});

// Function to send notification and save it to the database
const sendBetaNotification = (userId, notificationToken) => {
    const title = " مرحبًا بك في تطبيقنا التجريبي!";
    const message = "هذا التطبيق في مرحلته التجريبية. إذا كان لديك أي اقتراحات للتحسين، أخبرنا!";

    // Send notification using Expo
    if (Expo.isExpoPushToken(notificationToken)) {
        const notification = {
            to: notificationToken,
            sound: "default",
            title,
            body: message,
            data: { type: "beta_message" }
        };

        expo.sendPushNotificationsAsync([notification])
            .then(() => {
                console.log("✅ Notification sent successfully!");

                // Save notification in database
                const sqlInsertNotification = "INSERT INTO notifications (user_id, from_id, title, message) VALUES (?, ?, ?, ?)";
                db.query(sqlInsertNotification, [userId, 1, title, message], (err) => {
                    if (err) {
                        console.error("❌ Failed to save notification in database:", err);
                    } else {
                        console.log("✅ Notification saved in database!");
                    }
                });
            })
            .catch((err) => {
                console.error("❌ Failed to send notification:", err);
            });
    } else {
        console.error("❌ Invalid Expo push token:", notificationToken);
    }
};




app.post("/login", (req, res) => {
    const { phone, password , notificationToken } = req.body;
  
    if (!phone || !password) {
      return res.status(400).json({
        message: "رقم الهاتف وكلمة المرور مطلوبان!",
      });
    }
        const normalizedPhone = phone.replace(/^\+9620/, "+962");

  
    const sql = "SELECT * FROM users WHERE phone = ?";
    db.query(sql, [normalizedPhone], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "خطأ في الخادم الداخلي",
          error: err,
        });
      }
  
      if (results.length === 0 || results[0].password !== password) {
        return res.status(404).json({
          message: "رقم الهاتف أو كلمة المرور غير صحيحة!",
        });
      }
  
      if (!results[0].phone_verified) {
        // Phone number not verified, send verification code again
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
        const message = `رمز التحقق الخاص بك هو ${verificationCode}`;
        console.log("بدء إرسال رمز التحقق");
  
        sendVerificationCode(normalizedPhone, message)
          .then((response) => {
            console.log(response);
  
            // Save verification code to database
            const sql = "UPDATE verifications SET code = ? WHERE phone = ?";
            db.query(sql, [verificationCode, phone], (err, result) => {
              if (err) {
                return res.status(500).json({ message: "خطأ في الخادم الداخلي", error: err });
              }
              res.status(200).json({
                message: "تم إرسال رمز التحقق مرة أخرى." ,
                userId: results[0].id , 
              });
            });
          })
          .catch((error) => {
            console.log("خطأ");
  
            res.status(500).json({
              message: "فشل في إرسال رمز التحقق",
              error: error.message,
            });
          });
  
        return; // Prevent further execution
      }
  
      // Generate a secure session token using crypto
      const sessionToken = crypto.randomBytes(64).toString("hex");
      // Update the user's session token in the database
      const updateSql = "UPDATE users SET session_token = ? , notificationToken = ?  WHERE id = ?";
      db.query(updateSql, [sessionToken, notificationToken, results[0].id], (updateErr) => {
        if (updateErr) {
          console.error(updateErr);
          return res.status(500).json({
            message: "فشل في تحديث رمز الجلسة",
            error: updateErr,
          });
        }
  
        // Send the session token to the client
        res.status(200).json({
          message: "تسجيل الدخول ناجح!",
          user: results[0],
          sessionToken: sessionToken,
        });
      });
    });
  });
  


const uploadProfile = multer({ dest: 'uploads/profiles/' });

app.post("/update-picture/user", uploadProfile.single('imageFile'), (req, res) => {
    const { id, picture_url } = req.body;  // These are the text fields
    const imageFile = req.file;  // The file is parsed by multer


    // Check if id and picture_url are present
    if (!id || !picture_url) {
        return res.status(400).json({ message: "User ID and picture are required" });
    }

    let imageName = picture_url;

    if (imageFile) {
        const uploadDir = path.join(__dirname, "uploads", "profiles");

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Generate a unique file name
        imageName = `${Date.now()}-${imageFile.originalname}`;
        const imagePath = path.join(uploadDir, imageName);

        // Move the file to the profiles directory
        fs.renameSync(imageFile.path, imagePath);
    }

    // Save the image name or URL to the database
    const sql = "UPDATE users SET picture_url = ?, image_name = ? WHERE id = ?";
    db.query(sql, [picture_url, imageName, id], (error, result) => {
        if (error) {
            console.error("Error updating picture URL:", error);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Profile picture updated successfully", imageName });
    });
});


app.get('/user/profile-picture/:imageName', (req, res) => {
    const { imageName } = req.params;  // Get the image name from the request params
    const imagePath = path.join(__dirname, 'uploads', 'profiles', imageName);

    // Check if the file exists
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);  // Send the image file
    } else {
        res.status(404).json({ message: "Image not found" });
    }
});

app.get('/places/category-counts', (req, res) => {
  const query = `
    SELECT 
      home_type,
      COUNT(*) as count
    FROM 
      places
    WHERE 
      home_type IN ('فيلا / منزل', 'مسابح', 'صالات رياضة', 'مكاتب وعيادات', 
                    'شقة', 'مزرعة', 'ارض', 'شليهات', 'قاعات اجتماعات', 
                    'تنضيم رحلات', 'ملاعب', 'صالات رياضة')
    GROUP BY 
      home_type
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching category counts:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const categoryCounts = {};
    results.forEach(row => {
      categoryCounts[row.home_type] = row.count;
    });

    res.json(categoryCounts);
  });
});



// Update user details with phone number
app.post("/user/update-user", (req, res) => {
    const { id, name, password, currentpass } = req.body;
  
    if (!id || (!name && !password)) {
      return res.status(400).json({
        message: "Provide user ID and at least one field (name, password) to update",
      });
    }
  
    // Check if currentpass is provided
    if (!currentpass) {
      return res.status(200).json({
        message: "Provide current password to update",
      });
    }
  
    // Prepare SQL select query to get current password
    const selectSql = `SELECT password FROM users WHERE id = ?`;
    db.query(selectSql, [id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Internal server error",
          error: err,
        });
      }
  
      if (result.length === 0) {
        return res.status(200).json({
          message: "User not found",
        });
      }
  
      const storedPassword = result[0].password;
  
      // Compare currentpass with storedPassword
      if (currentpass !== storedPassword) {
        return res.status(200).json({
          message: "Current password does not match",
        });
      }
  
      // Prepare SQL update query based on provided fields
      let updateFields = [];
      let values = [];
  
      if (name) {
        updateFields.push("name = ?");
        values.push(name);
      }
      if (password) {
        updateFields.push("password = ?");
        values.push(password);
      }
  
      values.push(id); // Add user ID to the end of the values array
  
      const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
      db.query(sql, values, (updateErr, updateResult) => {
        if (updateErr) {
          console.error(updateErr);
          return res.status(500).json({
            message: "Internal server error",
            error: updateErr,
          });
        }
  
        if (updateResult.affectedRows === 0) {
          return res.status(200).json({
            message: "User not found",
          });
        }
  
        // Fetch the updated user data after successful 
        const selectUserSql = 'SELECT * FROM users WHERE id = ?';
        db.query(selectUserSql, [id], (selectErr, userResult) => {
          if (selectErr) {
            console.error('Error fetching updated user:', selectErr);
            return res.status(500).json({
              message: "Internal server error",
              error: selectErr,
            });
          }
  
          if (userResult.length === 0) {
            return res.status(200).json({
              message: "User not found after update",
            });
          }
  
          // Return success message along with updated user data
          res.status(200).json({
            message: "User updated successfully",
            user: userResult[0], // Updated user data
          });
        });
      });
    });
  });
  
  
  
app.get('/checkUser/:id/limitPosts', (req, res) => {
  const userId = req.params.id; // User ID from the route parameter

  // Query to fetch the limitPosts column for the given user ID
  const query = `
    SELECT limitPosts
    FROM users
    WHERE id = ?
  `;

  // Execute the query
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching limitPosts:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Check if a user was found
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the limitPosts value
    res.status(200).json({ limitPosts: results[0].limitPosts });
  });
});


app.get('/images/user/:id', (req, res) => {
  const userId = req.params.id;

  // SQL query to fetch only the image_name for the given user ID
  const query = 'SELECT image_name FROM users WHERE id = ?';

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching image_name:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the image_name
    res.json({ image_name: results[0].image_name });
  });
});

// ================== verfication ================
app.post("/verify-phone", (req, res) => {
  const { phone, code } = req.body;
  
  
  console.log("start verify", req.body);
  if (!phone || !code) {
    return res.status(400).json({ message: "Phone number and verification code are required!" });
  }
  
    const normalizedPhone = phone.replace(/^\+9620/, "+962");


  const sql = "SELECT * FROM verifications WHERE phone = ? AND code = ?";
  db.query(sql, [normalizedPhone, code], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error", error: err });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "Invalid verification code!" });
    }

    const updateSql = "UPDATE users SET phone_verified = true WHERE phone = ?";
    db.query(updateSql, [normalizedPhone], (updateErr) => {
      if (updateErr) {
        console.error(updateErr);
        return res.status(500).json({ message: "Internal server error", error: updateErr });
      }

      const deleteSql = "DELETE FROM verifications WHERE phone = ?";
      db.query(deleteSql, [normalizedPhone], (deleteErr) => {
        if (deleteErr) {
          console.error(deleteErr);
          return res.status(500).json({ message: "Internal server error", error: deleteErr });
        }

        const userSql = "SELECT * FROM users WHERE phone = ?";
        db.query(userSql, [normalizedPhone], (userErr, userResults) => {
          if (userErr) {
            console.error(userErr);
            return res.status(500).json({ message: "Internal server error", error: userErr });
          }

          if (userResults.length === 0) {
            return res.status(404).json({ message: "User not found!" });
          }

          res.status(200).json({ 
            message: "Phone number verified successfully!", 
            user: userResults[0] 
          });
        });
      });
    });
  });
});

app.get('/search/users', async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const searchTerm = `%${searchQuery}%`;
      
  const sql = `
    SELECT id, name, phone 
    FROM users 
    WHERE name LIKE ? OR phone LIKE ?
  `;
    
    db.query(sql, [searchTerm , searchTerm], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err});
    }
    res.json(results);
  });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: error});
  }
});

// Search places by ID
app.get('/search/places', async (req, res) => {
  try {
    const searchQuery = req.query.search || ''  ;
    const searchTerm = `%${searchQuery}%`;
   const sql = `
    SELECT id, title 
    FROM places 
    WHERE id LIKE ?
  `;
  
 db.query(sql, [searchTerm], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
  } catch (error) {
    console.error('Error searching places:', error);
    res.status(500).json({ error: error });
  }
});





// Verify reset token and allow password reset
app.post("/reset-password", (req, res) => {
  const { phone, resetToken, newPassword } = req.body;

    const normalizedPhone = phone.replace(/^\+9620/, "+962");

  if (!normalizedPhone || !resetToken || !newPassword) {
    return res.status(400).json({
      message: "Phone number, reset token, and new password are required!",
    });
  }

  const currentTime = new Date();
  const sql =
    "SELECT * FROM users WHERE phone = ? AND reset_token = ? AND reset_token_expires_at > ?";
  db.query(sql, [normalizedPhone, resetToken, currentTime], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        message: "Internal server error",
        error: err,
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        message: "Invalid reset token or expired. Please request a new one.",
      });
    }

    // Update user's password with newPassword
    const updateSql = "UPDATE users SET password = ? WHERE phone = ?";
    db.query(updateSql, [newPassword, normalizedPhone], (updateErr, updateResult) => {
      if (updateErr) {
        console.error(updateErr);
        return res.status(500).json({
          message: "Internal server error",
          error: updateErr,
        });
      }

      // Clear/reset the reset_token and reset_token_expires_at fields after successful password reset
      const clearResetSql =
        "UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE phone = ?";
      db.query(clearResetSql, [normalizedPhone], (clearErr, clearResult) => {
        if (clearErr) {
          console.error(clearErr);
          return res.status(500).json({
            message: "Internal server error",
            error: clearErr,
          });
        }

        res.status(200).json({
          message: "Password reset successful!",
        });
      });
    });
  });
});

// Function to generate a random reset token (example)
function generateResetToken() {
  return Math.random().toString(36).slice(2);
}

// ============ add post ======

// Route to handle adding a new place
// Route to handle adding a new place
const getValueOrDefault = (value, defaultValue = null) => {
  return value !== undefined && value !== null ? value : defaultValue;
};

app.post("/api/places/add",upload.fields([
  { name: "images", maxCount: 10 },
  { name: "chaletDocument", maxCount: 1 },
  { name: "poolDocument", maxCount: 1 }
]), (req, res) => {
  const {
    title,
    address,
    description,
    perks,
    extraInfo,
    maxGuests,
    price,
    ownerId,
    type,
    sellingMethod,
    ownerPhone,
    homeType,
    farmHasHouse,
    farmHasWater,
    farmHasFarmed,
    landInFaceOfStreet,
    numberOfStreetsInLand,
    spaceGeneral,
    numberOfHomeStage,
    totalStages,
    numberOfRooms,
    buyOrRent,
    rentType,
    ownerStatus,
    location,
    amenities,
    hajezDays,
    hajezType,
    variablePrices,
    publisherState,
    adsAccept,
    priceHide,
    specificDaysInCalander,
    specificDaysCalanderPrice,
    latitude,
    longitude,
    ownerName,
    poolType,
    deepPool,
    gettingCalls,
    containSdah,
    evacuation,
    tripLong,
    tripDate,
    timeOpen,
    meetingRoomType ,
    countPeople ,
    subscriptionTypeGym ,
    priceBeforeNoon	,
    priceAfterNoon , 
    street,
    closePlace
  } = req.body;

  const addedPhotos = req.files['images'] || []; // Array of file objects for images
  const chaletDocument = req.files['chaletDocument'] ? req.files['chaletDocument'][0] : null;
  const poolDocument = req.files['poolDocument'] ? req.files['poolDocument'][0] : null;
  const placeId = uuidv4();
  const folderName = placeId;
  const uploadDir = path.join(__dirname, "uploads", folderName);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const savedPhotos = [];
  let savedChaletDocument = null;
  let savedPoolDocument = null;

  // Move uploaded photos to the unique directory
  addedPhotos.forEach((file, index) => {
    const oldPath = file.path;
    const newPath = path.join(uploadDir, `${index + 1}_${file.originalname}`);
    try {
      fs.renameSync(oldPath, newPath);
      savedPhotos.push({
        originalName: file.originalname,
        savedAs: `${index + 1}_${file.originalname}`,
      });
    } catch (err) {
      console.error("Failed to move file:", err);
      return res.status(555).json({
        message: "Internal server error",
        error: err.message,
      });
    }
  });

  // Move chaletDocument if exists
  if (chaletDocument) {
    const oldPath = chaletDocument.path;
    const newPath = path.join(uploadDir, `chalet_${chaletDocument.originalname}`);
    try {
      fs.renameSync(oldPath, newPath);
      savedChaletDocument = `chalet_${chaletDocument.originalname}`;
    } catch (err) {
      console.error("Failed to move chaletDocument:", err);
      return res.status(555).json({
        message: "Internal server error",
        error: err.message,
      });
    }
  }

  // Move poolDocument if exists
  if (poolDocument) {
    const oldPath = poolDocument.path;
    const newPath = path.join(uploadDir, `pool_${poolDocument.originalname}`);
    try {
      fs.renameSync(oldPath, newPath);
      savedPoolDocument = `pool_${poolDocument.originalname}`;
    } catch (err) {
      console.error("Failed to move poolDocument:", err);
      return res.status(555).json({
        message: "Internal server error",
        error: err.message,
      });
    }
  }

  const sql = `
    INSERT INTO places (
      title, address, photos, description, perks, extra_info, max_guests, price, owner_id, folderName,
      type, sellingMethod, ownerPhone, home_type, farm_has_house, farm_has_water, farm_has_farmed,
      land_in_face_of_street, number_of_streets_in_land, space_general, number_of_home_stage, total_stages,
      number_of_rooms, buy_or_rent, rent_type, owner_status, location, amenities, hajez_days, hajez_type,
      variable_prices, publisher_state, ads_accept, priceHide, specificDaysInCalendar, calanderDaysPrice, lat, lng,
      ownerName, poolType, deepPool, gettingCalls, containSdah, evacuation, tripLong, tripDate, timeOpen,
      poolDocument, challetDocument ,meetingRoomType , countPeople , subscriptionTypeGym , priceBeforeNoon , priceAfterNoon , street , closePlace
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,? ,? , ?,?,?)`
  ;

  db.query(
    sql,
    [
      title || null, address || null, savedPhotos.map(photo => photo.savedAs).join(',')  || null, description || null, perks || null, extraInfo || null,
      maxGuests || null, price || null, ownerId || null, folderName || null, type || null, sellingMethod || null, ownerPhone || null,
      homeType || null, farmHasHouse || null, farmHasWater || null, farmHasFarmed || null, landInFaceOfStreet || null,
      numberOfStreetsInLand || null, spaceGeneral || null, numberOfHomeStage || null, totalStages || null, JSON.stringify(numberOfRooms) || null,
      buyOrRent || null, rentType || null, ownerStatus || null, location || null, JSON.stringify(amenities) || null, JSON.stringify(hajezDays) || null,
      hajezType || null, JSON.stringify(variablePrices) || null, publisherState || null, adsAccept || null, priceHide || null, JSON.stringify(specificDaysInCalander) || null,
      specificDaysCalanderPrice || null, latitude || 0, longitude || 0, ownerName || null, poolType || null, deepPool || null, gettingCalls || null,
      containSdah || null, evacuation || null, tripLong || null, tripDate || null, timeOpen || null, savedPoolDocument || null, savedChaletDocument || null , meetingRoomType || null ,
      countPeople || null , subscriptionTypeGym || null , priceBeforeNoon || price , priceAfterNoon || price , street || null , closePlace || null
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Internal server error during database operation",
          error: err.message,
        });
      }
      
      
      const query = `
    UPDATE users 
    SET limitPosts = limitPosts - 1 
    WHERE id = ? AND limitPosts > 0;
  `;

  db.query(query, [ownerId], (err, results) => {
    if (err) {
      console.error("Error updating limitPosts:", err);
      return res.status(500).json({ message:err });
    }

    // Check if any row was updated
    if (results.affectedRows === 0) {
      return res.status(400).json({ message: "No posts left to decrement or user not found" });
    }

    // Fetch the current value of limitPosts
    const fetchQuery = `SELECT limitPosts FROM users WHERE id = ?`;

    db.query(fetchQuery, [ownerId], (fetchErr, fetchResult) => {
      if (fetchErr) {
        console.error("Error fetching limitPosts:", fetchErr);
        return res.status(500).json({ message: fetchErr });
      }

      const currentLimitPosts = fetchResult[0].limitPosts;
      return res.status(200).json({
        message: "Place added successfully",
        placeId: result.insertId,
        limitPosts: currentLimitPosts, // Return the updated value
      });
    });
  });
  
  
      
    }
  );



});




// Route to get all places by ownerId
app.get("/api/places/by-owner/:ownerId", (req, res) => {
  const { ownerId } = req.params;
  console.log(ownerId);
  // SQL query to fetch places by ownerId
  const sql = "SELECT * FROM places WHERE owner_id = ?";
  db.query(sql, [ownerId], (err, results) => {
    if (err) {
      console.error("Failed to retrieve places:", err);
      return res.status(500).json({
        message: "Internal server error",
        error: err.message,
      });
    }
    res.status(200).json({
      message: "Places retrieved successfully",
      places: results,
    });
  });
});


app.post('/filter', (req, res) => {
  const { city, date, priceRange } = req.body;
  const [minPrice, maxPrice] = priceRange || [];

  // Basic date format validation (YYYY-MM-DD)
  const isValidDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date);

  // Construct SQL query with filters
  let sql = `SELECT * FROM places WHERE 1=1`;
  const params = [];

  if (city) {
    sql += ` AND address = ?`;
    params.push(city);
  }

  if (isValidDate) {
    sql += ` AND DATE(date) = ?`;
    params.push(date);
  } else if (date) {
    return res.status(400).json({ message: 'Invalid date format. Expected format: YYYY-MM-DD' });
  }

  if (minPrice !== undefined) {
    sql += ` AND price >= ?`;
    params.push(minPrice);
  }

  if (maxPrice !== undefined) {
    sql += ` AND price <= ?`;
    params.push(maxPrice);
  }

  // Execute SQL query
  db.query(sql, params, (error, results) => {
    if (error) {
      console.error('Error querying the database:', error);
      return res.status(500).json({ message: 'Internal Server Error', error: error.code });
    }
    res.json(results);
  });
});



app.get("/api/images/:folderName/:imageName", (req, res) => {
  const { folderName, imageName } = req.params;
  const filePath = path.join(__dirname, "uploads", folderName, imageName);
  console.log(filePath);

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    // Send the file as a response
    console.log("file found");
    res.sendFile(filePath);
  } else {
    // File not found
    console.log("file not found");

    res.status(404).json({ message: "File not found" });
  }
});

//   fetch posts Data
// Route to fetch filtered places
app.get("/api/places", (req, res) => {
  const { category, type } = req.query;

  // Base SQL query and parameters
  let sql = "SELECT * FROM places WHERE approved = ? AND active = ?";
  const queryParams = [1, 1]; // Values for `approved` and `active`

  // Add filters based on query parameters
  if (type) {
    sql += " AND buy_or_rent = ?";
    queryParams.push(type);
  }

  if (category && category.toLowerCase() !== "الكل") {
    sql += " AND home_type LIKE ?";
    queryParams.push(`%${category}%`);
  }

  console.log("Executing SQL query:", sql, "with parameters:", queryParams);

  // Execute the query
  db.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching places:", err);

    
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Reverse results (if needed) and send response
    const places = results.reverse(); // Optional: Reverse order for display
    res.json({ places });
  });
});


// Route to fetch filtered places
app.get("/api/admin/places", (req, res) => {

  // Base SQL query with ordering: places with approved = 0 will appear at the top
  let sql = "SELECT * FROM places ORDER BY approved ASC";

  // Execute SQL query
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching places:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Send the results as-is (since the order is already handled by SQL)
    res.json({ results });
  });
});

app.post('/api/admin/add-user', async (req, res) => {
  const { name, phone, password } = req.body;

  // Validate the input
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone, and password are required' });
  }

  try {
    // Hash the password before saving it

    // SQL query to insert the user
    const query = 'INSERT INTO users (name, phone, password , phone_verified) VALUES (?, ?, ? , ?)';
    const values = [name, phone, password , 1];

    db.query(query, values, (error, results) => {
      if (error) {
        console.error('Error adding user:', error);
        return res.status(500).json({ error: error });
      }

      res.status(201).json({ message: 'User added successfully', userId: results.insertId });
    });
  } catch (err) {
    console.error('Error hashing password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
})


app.post("/api/places/:id/toggle-active", (req, res) => {
    
  const { id } = req.params;
  
  // SQL query to toggle the 'active' field
  const query = `
    UPDATE places 
    SET active = NOT active
    WHERE id = ?;
  `;

  // Execute the query
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error toggling active status:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (result.affectedRows === 0) {
      // No place found with the given id
      return res.status(404).json({ error: "Place not found" });
    }

    res.json({ message: "Place active status toggled successfully" });
  });
});



app.get('/admin/filter-places', (req, res) => {
  const {
    address = '',  // Default to an empty string if undefined
    byorRent = '',
    category = '', 
    price = '', 
    rating = '' , 
    state = ""
  } = req.query;

  // Construct the SQL query dynamically based on the provided data
  let query = 'SELECT * FROM places WHERE 1=1'; // Starting with a condition that is always true
  const queryParams = [];

  // Only add conditions if the value is not empty
  if (address.trim()) {
    query += ' AND title LIKE ?';
    queryParams.push(`%${address}%`);
  }

  if (byorRent.trim()) {
    // Split by comma and filter out empty values
    const byorRentArray = byorRent.split(',').filter(Boolean);
    
    if (byorRentArray.length > 0) {
      // Use an SQL IN clause to match any value from the byorRent array
      query += ` AND buy_or_rent IN (${byorRentArray.map(() => '?').join(', ')})`;
      queryParams.push(...byorRentArray); // Spread the array into queryParams
    }
  }

  if (category.trim()) {
    query += ' AND home_type = ?';
    queryParams.push(category);
  }

  if (price.trim()) {
    query += ' AND price = ?';
    queryParams.push(price);
  }

    if(state){
        query += ' AND approved = ?';
        queryParams.push(state);
    }
  if (rating.trim()) {
    query += ' AND favorites = ?';
    queryParams.push(rating);
  }

  // Execute the query
  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(results);
  });
});


// Add a like to a place
app.post('/like', (req, res) => {
  const { user_id, place_id } = req.body;

  if (!user_id || !place_id) {
    return res.status(400).json({ error: 'user_id and place_id are required' });
  }

  // Check if the user has already liked the place
  const checkQuery = 'SELECT * FROM favorites WHERE user_id = ? AND place_id = ?';
  db.query(checkQuery, [user_id, place_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      // User has already liked the place, so unlike it
      const deleteQuery = 'DELETE FROM favorites WHERE user_id = ? AND place_id = ?';
      db.query(deleteQuery, [user_id, place_id], (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Update the heartSave value in the places table
        const updateQuery = 'UPDATE places SET heartSave = heartSave - 1 WHERE id = ?';
        db.query(updateQuery, [place_id], (err, results) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.status(200).json({ message: 'Like removed successfully and heartSave updated' });
        });
      });
    } else {
      // User has not liked the place, so like it
      const insertQuery = 'INSERT INTO favorites (user_id, place_id) VALUES (?, ?)';
      db.query(insertQuery, [user_id, place_id], (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Update the heartSave value in the places table
        const updateQuery = 'UPDATE places SET heartSave = heartSave + 1 WHERE id = ?';
        db.query(updateQuery, [place_id], (err, results) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.status(200).json({ message: 'Like added successfully and heartSave updated' });
        });
      });
    }
  });
})


app.get('/profile/places', (req, res) => {
  const ownerId = req.query.ownerId;  // assuming ownerId is passed as a query parameter

  if (!ownerId) {
    return res.status(400).json({ error: 'ownerId is required' });
  }

  // Query to fetch places for a specific ownerId
  const query = 'SELECT * FROM places WHERE owner_id = ?';
  db.query(query, [ownerId], (error, results) => {
    if (error) {
      console.error('Error fetching places:', error);
      return res.status(500).json({ error: 'Failed to fetch places' });
    }

    const ads = results.filter(place => place.buy_or_rent !== 'الحجز')
    const booking = results.filter(place => place.buy_or_rent === 'الحجز')
    
    res.json({ ads, booking });
  })


})

app.get('/api/user/:userId/likes', (req, res) => {
  const userId = req.params.userId;
  const sql = `
    SELECT p.* 
    FROM places p
    INNER JOIN favorites f ON p.id = f.place_id
    WHERE f.user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching liked places:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json(results);
  });
});



app.get('/admin/places/gat/:id', (req, res) => {
  const placeId = req.params.id;

  const query = 'SELECT * FROM places WHERE id = ?';
  
  db.query(query, [placeId], (error, results) => {
    if (error) {
      console.error('Error fetching place by ID:', error);
      res.status(500).json({ error: 'Database query failed' });
    } else if (results.length === 0) {
      res.status(404).json({ error: 'Place not found' });
    } else {
      res.json(results[0]);
    }
  });
});







app.get('/api/places/:id', (req, res) => {
  const placeId = req.params.id;
  const userId = req.query.user_id; // Get user_id from query parameters

  const sql = `
    SELECT p.*, 
           CASE WHEN f.user_id IS NOT NULL THEN 1 ELSE 0 END AS liked,
           u.picture_url AS owner_picture,
           u.trustable,
           u.image_name AS owner_image_name  -- Add image_name here
    FROM places p
    LEFT JOIN favorites f ON p.id = f.place_id AND f.user_id = ?
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `;

  db.query(sql, [userId, placeId], (err, results) => {
    if (err) {
      console.error('Error fetching place:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Place not found' });
    }

    // Increment viewers count by 1
    const updateViewersSql = `UPDATE places SET viewers = viewers + 1 WHERE id = ?`;
    db.query(updateViewersSql, [placeId], (updateErr) => {
      if (updateErr) {
        console.error('Error updating viewers:', updateErr);
      }
    });

    res.json(results[0]); // Return the place data with trustable field and owner_image_name
  });
});




app.get('/similar-products', (req, res) => {
    const { homeType, sellType, placeId } = req.query;
if (!homeType || !placeId) {
        return res.status(400).json({
            error: 'homeType and placeId are required'
        });
    }
    // Construct SQL query to fetch data based on home_type and buy_or_rent
    let sql = 'SELECT * FROM places WHERE approved = ? AND active = ?';
    const queryParams = [1, 1]; 

    if (homeType) {
        sql += ' AND home_type = ?';
        queryParams.push(homeType); 
    }

    if (sellType) {
        sql += ' AND buy_or_rent = ?';
        queryParams.push(sellType); 
    }

    if (placeId) {
        sql += ' AND id != ?';  // Exclude the specific placeId
        queryParams.push(placeId); 
    }

    // Limit the results to 6
    sql += ' LIMIT 6';

    db.query(sql, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching similar products:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (results.length === 0) {
            return res.json([]);
        }

        res.json(results);
    });
});

app.get('/admin/users', (req, res) => {
  const query = `
    SELECT 
      users.id,
      users.name,
      users.phone,
      users.trustable,
      users.blocked,
      users.description,
      users.picture_url,
      users.image_name,
      users.limitPosts,
      users.phone_verified,
      users.created,
      COUNT(DISTINCT places.id) AS postsCount,
      COUNT(DISTINCT bookings.id) AS bookingsCount,
      COUNT(DISTINCT favorites.id) AS favoritesCount,
      COUNT(DISTINCT CASE WHEN places.sponsored = 1 THEN places.id END) AS sponsoredPostsCount
    FROM users
    LEFT JOIN places ON places.owner_id = users.id
    LEFT JOIN bookings ON bookings.costumerId = users.id
    LEFT JOIN favorites ON favorites.user_id = users.id
    GROUP BY users.id;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users with counts:', err.stack);
      res.status(500).json({ error: err });
    } else {
      res.status(200).json(results);
    }
  });
});


app.put('/api/users/update', async (req, res) => {
  const { name, phone, password , userId , limitPosts , description } = req.body;

  // Construct the update query dynamically
  let query = 'UPDATE users SET name = ?, phone = ? , limitPosts = ? , description = ?';
  const queryParams = [name, phone , limitPosts , description];

  if (password) {
    // Hash the password if provided
    query += ', password = ?';
    queryParams.push(password);
  }

  query += ' WHERE id = ?';
  queryParams.push(userId);

  // Execute the query
  db.query(query, queryParams, (err, result) => {
    if (err) {
      console.error('Error updating user:', err.stack);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    res.status(200).json({ message: 'User updated successfully' });
  });
});


app.post('/admin/delete/users/:id', (req, res) => {
  const userId = req.params.id;
  
  // Step 1: Delete associated data first
  const queries = [
    'DELETE FROM bookings WHERE place_id IN (SELECT id FROM places WHERE owner_id = ?)',
    'DELETE FROM places WHERE owner_id = ?',
    'DELETE FROM notifications WHERE user_id = ?',
    'DELETE FROM followers WHERE follower_id = ? OR followee_id = ?',
    'DELETE FROM reviews WHERE user_id = ?'
  ];

  const deleteData = (query, params) => new Promise((resolve, reject) => {
    db.query(query, params, (err) => (err ? reject(err) : resolve()));
  });

  (async () => {
    try {
      for (const query of queries) {
        await deleteData(query, [userId, userId]);
      }
      
      // Step 2: Delete user
      db.query('DELETE FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
        
        res.status(200).json({ message: 'User and related data deleted successfully' });
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })();
});


// Route to get slugs from categories_booking, categories_rent, and categories_sale
app.get('/categories/slug', (req, res) => {
  const query = `
    SELECT slug FROM categories_booking WHERE isActive = 1
    UNION
    SELECT slug FROM categories_rent WHERE isActive = 1
    UNION
    SELECT slug FROM categories_sale WHERE isActive = 1
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching categories:', err);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    // Extract the slugs from the results
    const slugs = results.map(row => row.slug);

    // Send the slugs as the response
    res.json({ slugs });
  });
});


app.get('/categories/all', (req, res) => {
  const querySale = 'SELECT * FROM categories_sale WHERE isActive = 1';
  const queryRent = 'SELECT * FROM categories_rent WHERE isActive = 1';
  const queryBooking = 'SELECT * FROM categories_booking WHERE isActive = 1';

  // Execute all three queries
  db.query(querySale, (err, saleResults) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.query(queryRent, (err, rentResults) => {
      if (err) return res.status(500).json({ error: err.message });

      db.query(queryBooking, (err, bookingResults) => {
        if (err) return res.status(500).json({ error: err.message });

        // Send combined response
        res.json({
          categoriesSale: saleResults,
          categoriesRent: rentResults,
          categoriesBooking: bookingResults
        });
      });
    });
  });
});


app.get('/categories/admin/all', (req, res) => {
  const query = `
    SELECT * FROM (
      SELECT * FROM categories_sale
      UNION
      SELECT * FROM categories_rent
      UNION
      SELECT * FROM categories_booking
    ) AS combined
    GROUP BY slug
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    // Send the combined and distinct slugs as the response
    res.json({ categories: results });
  });
});

app.put('/categories/toggle/:slug', (req, res) => {
  const { slug } = req.params;

  const queries = [
    `UPDATE categories_sale SET isActive = NOT isActive WHERE slug = ?`,
    `UPDATE categories_rent SET isActive = NOT isActive WHERE slug = ?`,
    `UPDATE categories_booking SET isActive = NOT isActive WHERE slug = ?`
  ];

  let updated = false;

  // Loop over the queries and try to update the category in each table
  queries.forEach((query, index) => {
    db.query(query, [slug], (err, result) => {
      if (err) {
        console.error(`Error updating in table ${index + 1}:`, err);
        return res.status(500).json({ error: `Failed to update category in table ${index + 1}` });
      }

      // If a row was affected, the update was successful for this table
      if (result.affectedRows > 0) {
        updated = true;
      }

      // Check after the last query has been executed
      if (index === queries.length - 1) {
        if (updated) {
          res.json({ message: `Category with slug '${slug}' updated successfully` });
        } else {
          res.status(404).json({ message: `Category with slug '${slug}' not found` });
        }
      }
    });
  });
});


app.post('/api/places/filter/spesific', (req, res) => {
  const filters = req.body;

  // Start with a base query
  let query = 'SELECT * FROM places WHERE approved = ? AND active = ?';
  const queryParams = [1, 1]; // Ensure only approved and active places are fetched

  // Add conditions dynamically based on provided filters
  if (filters.title) {
    query += ' AND title LIKE ?';
    queryParams.push(`%${filters.title}%`);
  }

  if (filters.minPrice) {
    query += ' AND price >= ?';
    queryParams.push(filters.minPrice);
  }

  if (filters.maxPrice) {
    query += ' AND price <= ?';
    queryParams.push(filters.maxPrice);
  }

  if (filters.minSpace) {
    query += ' AND space_general >= ?';
    queryParams.push(filters.minSpace);
  }

  if (filters.maxSpace) {
    query += ' AND space_general <= ?';
    queryParams.push(filters.maxSpace);
  }

  if (filters.homeType) {
    query += ' AND home_type = ?';
    queryParams.push(filters.homeType);
  }

  if (filters.features && Array.isArray(filters.features)) {
    filters.features.forEach((feature) => {
      query += ' AND JSON_CONTAINS(amenities, ?)';
      queryParams.push(JSON.stringify([feature]));
    });
  }

  if (filters.negotiation) {
    query += ' AND ads_accept = ?';
    queryParams.push(filters.negotiation);
  }

  // Debug the query and parameters for development purposes
  console.log('Executing SQL query:', query);
  console.log('Query parameters:', queryParams);

  // Execute the query
  db.query(query, queryParams, (err, results) => {
    if (err) {
      // Log detailed error information for debugging
      console.error('Error executing SQL query:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        sql: err.sql, // Log the actual query string if supported
      });

      // Set a generic error message
      let errorMessage = 'An error occurred while filtering places. Please try again later.';

      // Provide specific error messages based on known error codes
      switch (err.code) {
        case 'ER_BAD_DB_ERROR':
          errorMessage = 'Database connection issue. Please try again later.';
          break;
        case 'ER_PARSE_ERROR':
          errorMessage = 'Invalid query syntax. Please check your input.';
          break;
        case 'ER_NO_SUCH_TABLE':
          errorMessage = 'The table you are querying does not exist.';
          break;
        default:
          // For other errors, keep the generic message
          break;
      }

      return res.status(500).json({ error: errorMessage });
    }

    // Return the results if no error occurred
    res.status(200).json({ places: results });
  });
});



app.post('/ads/update/:id', upload.array('newPhotos'), (req, res) => {
  const { id } = req.params;
  const { 
    title, description, price, amenities, variable_prices, 
    selected_day_price, speceficDayInCalander, existingPhotos, 
    folderName, priceBeforeNoon, priceAfterNoon, tripDate, 
    poolType, subsGym 
  } = req.body;

  let allPhotos = [];

  // If there are existing photos (from the database)
  if (existingPhotos) {
    allPhotos = Array.isArray(existingPhotos) ? existingPhotos : [existingPhotos];
  }

  // Process and save the new photos uploaded
  try {
    if (req.files && req.files.length > 0) {
      const folderPath = path.join(__dirname, "uploads", folderName);
      
      // Ensure the folder exists or create it
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // Iterate through the uploaded files and save them
        const newPhotoPaths = req.files.map(file => {
            
        const newFilePath = path.join(folderPath, `${1}_${file.filename}`);

        // Move the file from temporary location to the target folder
        try {
          fs.renameSync(file.path, newFilePath);
        } catch (err) {
          console.error(`Error moving file: ${file.filename}`, err);
          return { error: true, message: `Error moving file: ${file.filename}`, details: err.message };
        }

        return `${1}_${file.filename}`;
      }).filter(photo => typeof photo !== 'object'); // Filter out errors

      allPhotos = allPhotos.concat(newPhotoPaths);
    }
  } catch (err) {
    console.error('Error handling uploaded files:', err);
    return res.status(500).json({ message: 'Failed to upload files', error: err.message });
  }

  // Join all photo paths into a single string separated by commas
  const photos = allPhotos.join(',');

  // Initialize SQL query and parameters array
  let sql = `
    UPDATE places
    SET 
      title = ?,
      description = ?,
      price = ?,
      photos = ?,
      variable_prices = ?,
      calanderDaysPrice = ?,
      specificDaysInCalendar = ?,
      priceBeforeNoon = ?,
      priceAfterNoon = ?,
      tripDate = ?,
      poolType = ?,
      subscriptionTypeGym = ?
  `;

  const params = [
    title, description, price, photos, 
    JSON.stringify(variable_prices), 
    selected_day_price, 
    JSON.stringify(speceficDayInCalander), 
    priceBeforeNoon, priceAfterNoon, 
    tripDate, poolType, subsGym
  ];

  // Conditionally add the amenities to the SQL query and parameters array if provided
  if (amenities && amenities.length > 0) {
    sql += `, amenities = ?`;
    params.push(JSON.stringify(amenities));
  }

  // Complete the SQL query by adding the WHERE clause
  sql += ` WHERE id = ?`;
  params.push(id);

  // Execute the query
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error updating ad:', err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    res.status(200).json({ message: 'Ad updated successfully', photos });
  });
});


app.post('/delete/places/:id', (req, res) => {
  const placeId = req.params.id;

  if (!placeId) {
    return res.status(400).json({ error: 'Place ID is required' });
  }

  // Step 1: Get the ownerId from the place
  const selectQuery = 'SELECT owner_id FROM places WHERE id = ?';

  db.query(selectQuery, [placeId], (err, results) => {
    if (err) {
      console.error('Error fetching ownerId:', err);
      return res.status(500).json({ error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const ownerId = results[0].owner_id;

    // Step 2: Increment limitPosts for the user
    const incrementQuery = `
      UPDATE users 
      SET limitPosts = limitPosts + 1 
      WHERE id = ?
    `;

    db.query(incrementQuery, [ownerId], (err, incrementResults) => {
      if (err) {
        console.error('Error incrementing limitPosts:', err);
        return res.status(500).json({ error: 'Failed to increment limitPosts' });
      }

      // Step 3: Fetch the updated limitPosts
      const fetchQuery = 'SELECT limitPosts FROM users WHERE id = ?';

      db.query(fetchQuery, [ownerId], (err, fetchResults) => {
        if (err) {
          console.error('Error fetching updated limitPosts:', err);
          return res.status(500).json({ error: 'Failed to fetch updated limitPosts' });
        }

        const updatedLimitPosts = fetchResults[0].limitPosts;

        // Step 4: Delete the place
        const deleteQuery = 'DELETE FROM places WHERE id = ?';

        db.query(deleteQuery, [placeId], (err, deleteResults) => {
          if (err) {
            console.error('Error deleting place:', err);
            return res.status(500).json({ error: 'Failed to delete place' });
          }


          res.status(200).json({ 
            message: 'Place deleted successfully and limitPosts updated', 
            ownerId: ownerId,
            limitPosts: updatedLimitPosts // Return the updated limitPosts
          });
        });
      });
    });
  });
});





// Route to get places by title
app.get("/api/search/places", (req, res) => {
  const { title } = req.query;

  const sql = "SELECT * FROM places WHERE title LIKE ? OR id LIKE ?";

  db.query(sql, [`%${title}%` , `%${title}%`], (err, results) => {
    if (err) {
      console.error("Error searching places by title:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Check if results array is empty
    if (results.length === 0) {
      return res.json([]); // Return an empty array if no places found
    }

    res.json(results); // Return matching places
  });
});



app.post('/api/bookings/add', async (req, res) => {
  const {
    checkIn,
    checkOut,
    resirvedDays,
    name,
    phone,
    place,
    price,
    costumerId
  } = req.body;

  // Validate required fields
  if (!checkIn || !checkOut || !place || !price || !costumerId || !resirvedDays) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  try {
    // Fetch or validate user details
    let userDetails;
    if (name && phone) {
      userDetails = { name, phone };
    } else {
      const [userResult] = await new Promise((resolve, reject) => {
        db.query('SELECT name, phone FROM users WHERE id = ?', [costumerId], 
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
      
      if (!userResult) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }
      userDetails = userResult;
    }

    // Create booking ID
    const bookingId = uuidv4();

    // Insert booking
    await new Promise((resolve, reject) => {
      const insertSql = `
        INSERT INTO bookings 
          (id, check_in, check_out, name, phone, place_id, price, costumerId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      db.query(insertSql, [
        bookingId,
        checkIn,
        checkOut,
        userDetails.name,
        userDetails.phone,
        place,
        price,
        costumerId
      ], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    // Update place's notAllowedDays
    await new Promise((resolve, reject) => {
      const updateSql = `
        UPDATE places 
        SET notAllowedDays = ? 
        WHERE id = ?`;
      
      db.query(updateSql, [resirvedDays, place], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    // Get place owner information
    const [placeData] = await new Promise((resolve, reject) => {
      db.query('SELECT owner_id FROM places WHERE id = ?', [place], 
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // Get owner's Expo push token
    const [ownerData] = await new Promise((resolve, reject) => {
      db.query('SELECT notificationToken FROM users WHERE id = ?', [placeData.owner_id], 
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // Send Expo notification if token exists
    if (ownerData?.notificationToken) {
      try {
        const expo = new Expo();
        const notification = {
          to: ownerData.notificationToken,
          sound: 'default',
          title: 'حجز جديد',
          body: `لديك حجز جديد في إعلانك رقم ${place}`,
          data: { bookingId },
        };

        // Chunk and send notifications
        const chunks = expo.chunkPushNotifications([notification]);
        for (const chunk of chunks) {
          await expo.sendPushNotificationsAsync(chunk);
        }
      } catch (notificationError) {
        console.error('فشل إرسال الإشعار:', notificationError);
      }
    }

    // Insert notification log
    await new Promise((resolve, reject) => {
      const notifSql = `
        INSERT INTO notifications 
          (title, message, user_id, from_id, book_id)
        VALUES (?, ?, ?, ?, ?)`;
      
      db.query(notifSql, [
        'حجز جديد',
        `حجز جديد في الإعلان رقم ${place}`,
        placeData.owner_id,
        1, // Assuming 1 is system/admin ID
        bookingId
      ], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    res.status(200).json({
      message: 'تم إضافة الحجز بنجاح',
      bookingId,
    });

  } catch (error) {
    console.error('خطأ في إضافة الحجز:', error);
    res.status(500).json({ 
      error: 'خطأ داخلي في الخادم',
      details: error.message 
    });
  }
});



app.get('/get-all-bookings', async (req, res) => {
  try {
    // Get all bookings with user (owner) and place details
    const [bookingsRows] = await new Promise((resolve, reject) => {
      db.query(
        `SELECT 
          bookings.id,
          bookings.place_id,
          bookings.check_in,
          bookings.check_out,
          bookings.no_of_guests,
          bookings.price,
          bookings.status,
          users.name AS user_name,
          users.phone,
          places.title AS place_title,
          places.id AS placeId,
          places.photos AS place_photos,
          places.home_type AS place_type,
          places.folderName
        FROM bookings
        INNER JOIN places ON bookings.place_id = places.id
        LEFT JOIN users ON places.owner_id = users.id  -- FIX: Join places.owner_id with users.id
        ORDER BY bookings.check_in DESC`,
        (err, rows) => {
          if (err) return reject(err);
          resolve([rows]);
        }
      );
    });

    // Format the response
    const formattedBookings = bookingsRows.map(booking => ({
      id: booking.id,
      userName: booking.user_name || 'اسم المستخدم غير معرف',
      phone: booking.phone || 'رقم الهاتف غير متوفر',
      duration: calculateDuration(booking.check_in, booking.check_out),
      date: formatDate(booking.check_in),
      placeTitle: booking.place_title,
      image: booking.place_photos?.[0] || 'default.jpg',
      type: booking.place_type,
      placeId:booking.placeId ,
      guests: booking.no_of_guests,
      rooms: 2, // Consider adding this to your places table
      price: `${booking.price} JOD`,
      status: booking.status || 'Pending',
      folderName: booking.folderName,
      photos: booking.place_photos || null,
    }));

    res.status(200).json(formattedBookings);
  } catch (error) {
    console.error('Error fetching bookings:', {
      message: error.message,
      stack: error.stack,
      sqlError: error.sqlMessage
    });
    res.status(500).json({ error });
  }
});




// Endpoint to get bookings by user ID
app.post('/get-bookings-by-user', async (req, res) => {
  const { userId } = req.body;

  try {
    // 1. Get user's places
    const [placesRows] = await new Promise((resolve, reject) => {
      db.query(
        'SELECT id, folderName, photos, title, home_type FROM places WHERE owner_id = ?',
        [userId],
        (err, rows) => {
          if (err) return reject(err);
          resolve([rows]);
        }
      );
    });

    if (placesRows.length === 0) {
      return res.status(200).json([]);
    }

    // 2. Get bookings for these places
    const placeIds = placesRows.map(place => place.id);
    
    // Fix 1: Use dynamic placeholders for IN clause
    const placeholders = placeIds.map(() => '?').join(',');
// Corrected SQL query without JS-style comments
const [bookingsRows] = await new Promise((resolve, reject) => {

db.query(
  `SELECT 
    id, 
    place_id,
    check_in, 
    check_out, 
    no_of_guests, 
    price, 
    name AS userName, 
    phone, 
    status 
  FROM bookings 
  WHERE place_id IN (${placeholders})
  ORDER BY check_in DESC`,  // Add sorting here
  placeIds,  // Keep place IDs as parameters
  (err, rows) => {
    if (err) return reject(err);
    resolve([rows]);
  }
);
});

    // 3. Combine data with type conversion
    const formattedBookings = bookingsRows
      .map((booking) => {
        // Fix 2: Ensure numeric comparison
        const matchingPlace = placesRows.find(
          place => place.id === Number(booking.place_id)
        );

        if (!matchingPlace) {
          console.warn(`Orphan booking ${booking.id} has invalid place_id ${booking.place_id}`);
          return null;
        }

        return {
          id: booking.id,
          userName: booking.userName || 'اسم المستخدم غير معرف',
          phone: booking.phone || 'رقم الهاتف غير متوفر',
          duration: calculateDuration(booking.check_in, booking.check_out),
          date: formatDate(booking.check_in),
          placeTitle: matchingPlace.title,
          image: matchingPlace.photos?.[0] || 'default.jpg',
          type: matchingPlace.home_type,
          guests: booking.no_of_guests,
          rooms: 2, // You need to add this field to your places table
          price: `${booking.price} JOD`,
          status: booking.status || 'Pending',
          folderName: matchingPlace.folderName,
          photos: matchingPlace.photos || null,
        };
      })
      .filter(booking => booking !== null);

    console.log('Final formatted bookings:', formattedBookings); // Debug log
    res.status(200).json(formattedBookings);
    
  } catch (error) {
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      queryError: error.sqlMessage // If SQL error
    });
    res.status(500).json({ error: error });
  }
});



// Helper function to calculate duration
function calculateDuration(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day} ${getMonthName(month)} ${year}`;
}

// Function to get Arabic month names
function getMonthName(month) {
  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  return months[month - 1];
}




app.post('/update-booking-status', async (req, res) => {
  const { bookingId, newStatus } = req.body;

  try {
    // Validate input
    if (!bookingId || !newStatus) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update database
    const [result] = await new Promise((resolve, reject) => {
      db.query(
        `UPDATE bookings b
         JOIN places p ON b.place_id = p.id
         SET b.status = ?
         WHERE b.id = ? AND p.owner_id = ?`,
        [newStatus, bookingId, req.body.userId], // Assuming you send userId in request
        (err, results) => {
          if (err) return reject(err);
          resolve([results]);
        }
      );
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found or unauthorized' });
    }

    res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Update user name
app.post("/user/update-name", (req, res) => {
  const { id, name , description } = req.body;

  if (!id || !name) {
    return res.status(400).json({
      message: "Provide user ID and name to update",
    });
  }

  // Prepare SQL update query for updating the name
  const sql = `UPDATE users SET name = ? , description = ?  WHERE id = ?`;
  db.query(sql, [name , description, id], (updateErr, updateResult) => {
    if (updateErr) {
      console.error(updateErr);
      return res.status(500).json({
        message: "Internal server error",
        error: updateErr,
      });
    }

    if (updateResult.affectedRows === 0) {
      return res.status(200).json({
        message: "User not found",
      });
    }

    // Fetch the updated user data after successful update
    const selectUserSql = 'SELECT * FROM users WHERE id = ?';
    db.query(selectUserSql, [id], (selectErr, userResult) => {
      if (selectErr) {
        console.error('Error fetching updated user:', selectErr);
        return res.status(500).json({
          message: "Internal server error",
          error: selectErr,
        });
      }

      if (userResult.length === 0) {
        return res.status(200).json({
          message: "User not found after update",
        });
      }

      // Return success message along with updated user data
      res.status(200).json({
        message: "User name updated successfully",
        user: userResult[0], // Updated user data
      });
    });
  });
});


// Route to get bookings by customer ID
app.get("/api/bookings", (req, res) => {
  const { costumerId } = req.query;
  const sql = "SELECT * FROM bookings WHERE costumerId = ?";

  db.query(sql, [costumerId], (err, results) => {
    if (err) {
      console.error("Error fetching bookings by customer ID:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json({ bookings: results });
  });
  
});

app.get('/bookings/getTitles/:place_id', (req, res) => {
  const placeId = req.params.place_id;

  const query = `
    SELECT id, check_in, check_out
    FROM bookings
    WHERE place_id = ?
  `;

  db.query(query, [placeId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed' });
    }

    // Format the results
    const formattedResults = results.map(booking => ({
      id: booking.id,
      ckeckIn: booking.check_in ,
      chekcOut : booking.check_out
    }));

    res.json(formattedResults);
  });
});


app.get("/api/bookings/get/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM bookings WHERE id = ?";

  db.query(sql, [id], (err, bookingResult) => {
    if (err) {
      console.error("Error getting booking by ID:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (bookingResult.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingResult[0];
    const placeSql = "SELECT * FROM places WHERE id = ?";

    db.query(placeSql, [booking.place_id], (err, placeResult) => {
      if (err) {
        console.error("Error getting place details:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (placeResult.length === 0) {
        console.error("Place not found for booking:", booking.id);
        return res.status(500).json({ error: "Place not found for booking" });
      }

      const place = placeResult[0];
      // Combine booking and place details
      const bookingWithPlace = {
        ...booking,
        place: place,
      };

      res.json(bookingWithPlace);
    });
  });
});





app.post('/check-phone', async (req, res) => {
    const { phoneNumber } = req.body;
    
     const phone = phoneNumber.replace(/^\+9620/, "+962");

    try {
        // Check if phone number exists
        const sql = 'SELECT * FROM users WHERE phone = ?';

        db.query(sql, [phone], (err, result) => {
            if (err) {
                console.error('Database query error:', err);
                res.status(500).json({ success: false, message: 'An error occurred while retrieving user' });
                return;
            }

            if (result.length > 0) {
                const user = result[0];
                const lastSentTime = user.lastCodeSentTime ? new Date(user.lastCodeSentTime) : null;
                const now = new Date();

                if (lastSentTime && (now - lastSentTime) < 30000) { 
                    // If the last code was sent less than 30 seconds ago
                    return res.status(429).json({
                        message: 'Please wait before requesting another code.',
                        success: false
                    });
                }

                const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
                let message = `رمز استرجاع كلمة المرور هو ${verificationCode}`;

                sendVerificationCode(phone, message)
                    .then(() => {
                        const updateSql = 'UPDATE users SET lastCodeSentTime = ? WHERE phone = ?';
                        db.query(updateSql, [now, phone], (err , result)=>{
                            if(err){
                                return res.json({err});
                            }
                            
                       

                        res.status(200).json({
                            message: 'Phone found and the verification code was sent to the phone number.',
                            success: true,
                            code: verificationCode
                        });
                        });
                    })
                    .catch((error) => {
                        console.log(error);
                        res.status(500).json({
                            message: 'Failed to send verification code',
                            error: error.message
                        });
                    });

            } else {
                res.status(200).json({ success: false, message: 'Phone number not found' });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});







app.post('/reset-password-forget', (req, res) => {
  const { phoneNumber, newPassword } = req.body;
     const normalizedPhone = phoneNumber.replace(/^\+9620/, "+962");

  // Check if phone number exists
  const sql = 'SELECT * FROM users WHERE phone = ?';
  db.query(sql, [normalizedPhone], (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ success: false, message: 'An error occurred while retrieving user' });
    }

    if (result.length > 0) {
      // Update the password in the database
      const updateSql = 'UPDATE users SET password = ? WHERE phone = ?';
      db.query(updateSql, [newPassword, normalizedPhone], (err, updateResult) => {
        if (err) {
          console.error('Database update error:', err);
          return res.status(500).json({ success: false, message: 'An error occurred while updating password' });
        }

        if (updateResult.affectedRows > 0) {
          // Retrieve the updated user information
          const userSql = 'SELECT * FROM users WHERE phone = ?';
          db.query(userSql, [normalizedPhone], (err, updatedUser) => {
            if (err) {
              console.error('Database query error:', err);
              return res.status(500).json({ success: false, message: 'An error occurred while retrieving updated user data' });
            }
            
            

            // Send the response with updated user data
            res.json({ 
              success: true, 
              message: 'Password updated successfully',
              user: updatedUser[0] // Return the first user record
            });
          });
        } else {
          // Phone number not found after update
          res.status(400).json({ success: false, message: 'Phone number not found' });
        }
      });
    } else {
      // Phone number not found
      res.status(400).json({ success: false, message: 'Phone number not found' });
    }
  });
})




app.post('/user/phone-verification', (req, res) => {
    const { id, phone } = req.body;

    // First, check if the phone number is already in use by another user
    const checkPhoneQuery = 'SELECT * FROM users WHERE phone = ?';
    
    db.query(checkPhoneQuery, [phone], (err, results) => {
        if (err) {
            console.error('Error checking phone number:', err);
            return res.status(500).json({
                message: 'Server error',
                error: err.message,
            });
        }

        if (results.length > 0) {
            // If the phone number is already in use, return an error message
            return res.status(400).json({
                message: 'Phone number is already used by another user',
                success: false,
            });
        }

        // If the phone number is not in use, proceed to send the verification code
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
        const message = `رمز التحقق من الرقم الجديد ${verificationCode}`;

        sendVerificationCode(phone, message)
            .then((response) => {
                // Return success message with the verification code
                res.status(200).json({
                    message: 'Phone verification code sent successfully',
                    success: true,
                    code: verificationCode,
                });
            })
            .catch((error) => {
                console.error('Error sending verification code:', error);
                res.status(500).json({
                    message: 'Failed to send verification code',
                    error: error.message,
                });
            });
    });
});





app.post('/user/update-phone', (req, res) => {
    const userId = req.body.id;
    const newPhone = req.body.phone;

    if (!newPhone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    const sql = 'UPDATE users SET phone = ? WHERE id = ?';
    
    db.query(sql, [newPhone, userId], (err, result) => {
        if (err) {
            console.error('Error updating phone number:', err);
            return res.status(500).json({ error: 'Failed to update phone number' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Phone number updated successfully' });
    });
});



// filter

app.get('/places/filter/city', async (req, res) => {
    try {
        const { longitude, latitude, name } = req.query;

        if (!longitude || !latitude || !name) {
            return res.status(400).json({ error: 'Longitude, latitude, and name are required' });
        }

        // Convert latitude and longitude to float
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({ error: 'Invalid latitude or longitude' });
        }

        // MySQL query with additional conditions for approved and active
        const query = `
            SELECT *, 
            (
                6371 * acos(
                    cos(radians(?)) * cos(radians(lat)) * 
                    cos(radians(lng) - radians(?)) + 
                    sin(radians(?)) * sin(radians(lat))
                )
            ) AS distance
            FROM places
            WHERE (address LIKE ? 
            OR (
                6371 * acos(
                    cos(radians(?)) * cos(radians(lat)) * 
                    cos(radians(lng) - radians(?)) + 
                    sin(radians(?)) * sin(radians(lat))
                ) <= 10
            ))
            AND approved = true
            AND active = true
            HAVING distance IS NOT NULL
            ORDER BY distance;
        `;

        const values = [lat, lng, lat, `%${name}%`, lat, lng, lat];
        
        db.query(query, values, (error, results) => {
            if (error) {
                console.error('Database query error:', error); // Log the error for debugging
                return res.status(500).json({ error: 'Database query failed' });
            }
            
            // Debugging: log query results
            console.log('Query results:', results);
            
            if (results.length === 0) {
                return res.status(200).json([]);
            }

            res.json({ places: results });
        });
    } catch (error) {
        console.error('Server error:', error); // Log the error for debugging
        res.status(500).json({ error: 'Server error' });
    }
});

function generateRandomToken(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        token += characters[randomIndex];
    }
    return token;
}


app.post('/api/admin/login', (req, res) => {
  const { phone, password } = req.body;
        
  if (!phone || !password) {
    return res.status(400).json({ message: 'يرجى إدخال رقم الهاتف وكلمة المرور' });
  }

  // Query to check if the admin exists with the provided phone and password
  const sql = 'SELECT * FROM admins WHERE phone = ? AND password = ?';
  db.query(sql, [phone, password], (err, results) => {
    if (err) {
      console.error('Error querying the database:', err);
      return res.status(500).json({ message: 'خطأ في الخادم' });
    }

    if (results.length > 0) {
      // Admin exists
      const adminData = results[0]; // Get the admin data

      // Generate a random token
      const token = generateRandomToken(10);

      // Update the token in the admins table
      const updateTokenSql = 'UPDATE admins SET token = ? WHERE phone = ?';
      db.query(updateTokenSql, [token, phone], (err) => {
        if (err) {
          console.error('Error updating the token:', err);
          return res.status(500).json({ message: 'خطأ في تحديث الرمز' });
        }

        // Respond with the token and admin data
        return res.json({ token, admin: adminData });
      });
    } else {
      // Admin not found or incorrect password
      return res.status(401).json({ message: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
    }
  });
});



app.get('/admin/counts', (req, res) => {
  // Initialize an object to store all the counts
  const counts = {};

  // Step 1: Count total places
  db.query('SELECT COUNT(*) AS totalAdvertient FROM places', (err, results) => {
    if (err) {
      console.error('Error fetching total places:', err);
      return res.status(500).send('Error fetching data');
    }

    counts.totalAdvertient = results[0].totalAdvertient;

    // Step 2: Count total users
    db.query('SELECT COUNT(*) AS totalUsers FROM users', (err, results) => {
      if (err) {
        console.error('Error fetching total users:', err);
        return res.status(500).send('Error fetching data');
      }

      counts.totalUsers = results[0].totalUsers;

      // Step 3: Count places where approved = false
      db.query('SELECT COUNT(*) AS addsnotaprovi FROM places WHERE approved = 0', (err, results) => {
        if (err) {
          console.error('Error fetching not accepted places:', err);
          return res.status(500).send('Error fetching data');
        }

        counts.addsnotaprovi = results[0].addsnotaprovi;

        // Step 4: Count total bookings
        db.query('SELECT COUNT(*) AS bookingNumbe FROM bookings', (err, results) => {
          if (err) {
            console.error('Error fetching total bookings:', err);
            return res.status(500).send('Error fetching data');
          }

          counts.bookingNumbe = results[0].bookingNumbe;

          // Step 5: Count total reports
          db.query('SELECT COUNT(*) AS totalReports FROM reports', (err, results) => {
            if (err) {
              console.error('Error fetching total reports:', err);
              return res.status(500).send('Error fetching data');
            }

            counts.totalReports = results[0].totalReports;

            // Step 6: Count total sponsored places
            db.query('SELECT COUNT(*) AS totalSponsoredPlaces FROM places WHERE sponsored = 1', (err, results) => {
              if (err) {
                console.error('Error fetching total sponsored places:', err);
                return res.status(500).send('Error fetching data');
              }

              counts.totalSponsoredPlaces = results[0].totalSponsoredPlaces;

              // Step 7: Count total trusted users (trustable = 1)
              db.query('SELECT COUNT(*) AS totalTrustedUsers FROM users WHERE trustable = 1', (err, results) => {
                if (err) {
                  console.error('Error fetching total trusted users:', err);
                  return res.status(500).send('Error fetching data');
                }

                counts.totalTrustedUsers = results[0].totalTrustedUsers;

                // Finally, send the response with all counts
                res.json(counts);
              });
            });
          });
        });
      });
    });
  });
});


app.get('/admins', (req, res) => {
  const query = 'SELECT * FROM admins';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err });
    }
    res.json(results);
  });
});

app.post('/admins', (req, res) => {
  const { phone, password, role , name } = req.body;

  if (!phone || !password || !role) {
    return res.status(400).json({ error: 'Phone, password, and role are required' });
  }

  const query = 'INSERT INTO admins (phone, password, role , name) VALUES (?, ?, ? , ?)';
  db.query(query, [phone, password, role , name], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err });
    }
    res.status(201).json({ message: 'Admin added successfully', adminId: results.insertId });
  });
});


app.delete('/admins/:id', (req, res) => {
  const adminId = req.params.id;

  const query = 'DELETE FROM admins WHERE id = ?';
  db.query(query, [adminId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json({ message: 'Admin removed successfully' });
  });
});


app.delete('/places/:id', (req, res) => {
  const placeId = req.params.id;

  const query = 'DELETE FROM places WHERE id = ?';
  db.query(query, [placeId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }
    res.json({ message: 'Place deleted successfully' });
  });
});



app.put('/places/:id/approve', (req, res) => {
  const placeId = req.params.id;
  const { adminToken } = req.body;

  // 1. Toggle the 'approved' column
  const updateQuery = 'UPDATE places SET approved = NOT approved WHERE id = ?';
  db.query(updateQuery, [placeId], (updateErr, updateResults) => {
    if (updateErr) {
      console.error('Database error (update place):', updateErr);
      return res.status(500).json({ error: 'Database error', details: updateErr });
    }

    if (updateResults.affectedRows === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }

    // 2. Get the updated approval status and owner ID
    const selectQuery = 'SELECT approved, owner_id FROM places WHERE id = ?';
    db.query(selectQuery, [placeId], (selectErr, placeResults) => {
      if (selectErr) {
        console.error('Database error (select place):', selectErr);
        return res.status(500).json({ error: 'Database error', details: selectErr });
      }

      if (placeResults.length === 0) {
        return res.status(404).json({ error: 'Place not found' });
      }

      const { approved, owner_id } = placeResults[0];
      const approvalStatus = approved ? 'تمت الموافقة' : 'لم تتم الموافقة';

      // 3. Get the admin details
      const fetchAdminQuery = 'SELECT id, name FROM admins WHERE token = ?';
      db.query(fetchAdminQuery, [adminToken], (adminErr, adminResults) => {
        if (adminErr) {
          console.error('Database error (fetch admin):', adminErr);
          return res.status(500).json({ error: 'Database error', details: adminErr });
        }

        if (adminResults.length === 0) {
          return res.status(404).json({ error: 'Admin not found' });
        }

        const admin = adminResults[0];
        const adminId = admin.id;
        const adminName = admin.name;

        // 4. Log the admin action
        const actionType = 'تغير حالة الاعلان';
        const actionMessage = `${placeId} على الاعلان رقم ${approvalStatus}`;

        const insertActionQuery = `
          INSERT INTO admin_actions_history 
          (admin_id, admin_name, action_type, place_id, action_message)
          VALUES (?, ?, ?, ?, ?)
        `;

        db.query(insertActionQuery, [adminId, adminName, actionType, placeId, actionMessage], (insertErr, insertResults) => {
          if (insertErr) {
            console.error('Database error (insert action):', insertErr);
            return res.status(500).json({ error: 'Database error', details: insertErr });
          }

          // 5. Get the user's push token
          const userQuery = 'SELECT notificationToken FROM users WHERE id = ?';
          db.query(userQuery, [owner_id], (userErr, userResults) => {
            if (userErr) {
              console.error('Database error (fetch user):', userErr);
              return res.status(500).json({ error: 'Database error', details: userErr });
            }

            if (userResults.length === 0) {
              return res.status(404).json({ error: 'Owner not found' });
            }

            const { notificationToken } = userResults[0];

            // 6. Send the notification if the token is valid
            if (notificationToken && Expo.isExpoPushToken(notificationToken)) {
              const message = `الإعلان رقم ${placeId} ${approvalStatus}`;
              const notificationData = {
                to: notificationToken,
                sound: 'default',
                title: 'حالة الموافقة على الإعلان',
                body: message,
              };

              expo.sendPushNotificationsAsync([notificationData])
                .then(() => {
                  console.log('Notification sent successfully');
                })
                .catch((expoErr) => {
                  console.error('Error sending notification:', expoErr);
                });
            }

            // 7. Save the notification in the database
            const notificationQuery = `
              INSERT INTO notifications (from_id, user_id, title, message, placeId)
              VALUES (?, ?, ?, ?, ?)
            `;

            db.query(notificationQuery, [1, owner_id, 'حالة الموافقة على الإعلان', actionMessage, placeId], (notifyErr, notifyResults) => {
              if (notifyErr) {
                console.error('Database error (insert notification):', notifyErr);
                return res.status(500).json({ error: 'Database error', details: notifyErr });
              }

              // 8. Return success response
              res.status(200).json({
                success: true,
                message: 'تم تحديث حالة الموافقة على الإعلان وإرسال الإشعار بنجاح',
              });
            });
          });
        });
      });
    });
  });
});


app.delete('/bookings/:id', (req, res) => {
  const bookingId = req.params.id;

  const query = 'DELETE FROM bookings WHERE id = ?';
  db.query(query, [bookingId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ message: 'Booking deleted successfully' });
  });
});

const slidersDirectory = path.join(__dirname, 'uploads', 'sliders');

const iconsDirectory = path.join(__dirname, 'uploads', 'icons');


app.post('/api/slides', upload.single('slide'), (req, res) => {
  const file = req.file;
  const {serviceId} = req.body

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const tempFilePath = path.join(__dirname, 'uploads', 'temp', file.filename);
  const sliderFilePath = path.join(__dirname, 'uploads', 'sliders', file.filename); // Path for sliders

  // Move the file to the sliders directory
  fs.rename(tempFilePath, sliderFilePath, (err) => {
    if (err) {
      console.error('Error moving file to sliders directory:', err);
      return res.status(500).json({ error: 'Could not move file' });
    }

    const filePath = `${file.filename}`; // Relative path for the DB

    // Prepare a query to insert the slide into the database
    const query = `INSERT INTO sliders (name, file_path , serviceId) VALUES ?`;
    const values = [[file.originalname, filePath , serviceId]]; // Single entry as an array

    db.query(query, [values], (err, result) => {
      if (err) {
        console.error('Error inserting data into database:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Send a success response back to the client
      res.json({ slide: { name: file.originalname, file_path : filePath } });
    });
  });
});



app.use('/uploads/sliders', express.static(path.join(__dirname, 'uploads/sliders')));

// Route to fetch all slider images
app.get('/api/slides', (req, res) => {
  const query = 'SELECT * FROM sliders';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching data from database:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Send back the slider data (name and path)
    res.json(results);
  });
});



// Route to get a specific image by file name
app.get('/api/slides/single/:fileName', (req, res) => {
  const { fileName } = req.params;

  // Construct the full file path
  const filePath = path.join(slidersDirectory, fileName);

  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Send the file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ message: 'Error sending file' });
      }
    });
  });
});

app.get('/api/icons/single/:fileName', (req, res) => {
  const { fileName } = req.params;

  // Construct the full file path
  const filePath = path.join(iconsDirectory, fileName);

  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Send the file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ message: 'Error sending file' });
      }
    });
  });
});

app.delete('/api/slides/:fileName', (req, res) => {
  const { fileName } = req.params;

  // Construct the full file path
  const filePath = path.join(slidersDirectory, fileName);

  // Remove the file from the filesystem
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).json({ message: 'Error deleting file' });
    }

    // Prepare SQL query to delete the entry from the database
    const query = 'DELETE FROM sliders WHERE file_path = ?';
    
    // Assuming the file path in DB matches the filename with the uploads directory
    const dbFilePath = `${fileName}`;

    db.query(query, [dbFilePath], (dbErr, result) => {
      if (dbErr) {
        console.error('Error deleting from database:', dbErr);
        return res.status(500).json({ message: 'Database error' });
      }

      res.json({ message: 'Slide deleted successfully' });
    });
  });
});




app.post('/update-settings', (req, res) => {
    const { whatsappLink, phoneNumber, commissionValue, limitPosts , appVersion } = req.body;

    // Check if settings already exist
    const checkSql = 'SELECT COUNT(*) AS count FROM settings';

    db.query(checkSql, (err, results) => {
        if (err) {
            console.error('Error checking settings:', err);
            return res.status(500).json({ error: 'Failed to check settings.' });
        }

        const exists = results[0].count > 0;

        // If settings exist, update them; otherwise, insert the new settings
        const sql = exists
            ? `
                UPDATE settings SET 
                    whatsapp_link = ?, 
                    phone_number = ?, 
                    commission_value = ?,
                    app_version = ?
                WHERE id = 1
            `
            : `
                INSERT INTO settings (whatsapp_link, phone_number, commission_value , app_version)
                VALUES (?, ?, ? , ?)
            `;

        const values = exists
            ? [whatsappLink, phoneNumber, commissionValue , appVersion]
            : [whatsappLink, phoneNumber, commissionValue , appVersion];

        // Execute the settings query
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('Error saving settings:', err);
                return res.status(500).json({ error: 'Failed to save settings.' });
            }

            // Update the default value of `limitPlaces` in the `users` table
            const updateLimitPostsSql = `
                ALTER TABLE users 
                MODIFY COLUMN limitPosts INT DEFAULT ?
            `;
            db.query(updateLimitPostsSql, [limitPosts], (err, result) => {
                if (err) {
                    console.error('Error updating limitPlaces default value:', err);
                    return res.status(500).json({ error: err });
                }

                res.status(200).json({ message: 'Settings and limitPlaces default value updated successfully.', result });
            });
        });
    });
});


app.post('/admin/update-password', (req, res) => {
    const { oldPassword, newPassword, token } = req.body;

    // Check if the old password is correct
    const checkSql = 'SELECT password FROM admins WHERE token = ?';
    db.query(checkSql, [token], (err, results) => {
        if (err) {
            console.error('Error fetching admin:', err);
            return res.status(500).json({ error: 'Failed to fetch admin.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Admin not found.' });
        }

        const storedOldPassword = results[0].password;

        // Compare the old password
        if (oldPassword !== storedOldPassword) {
            return res.status(400).json({ error: 'Old password is incorrect.' });
        }

        // Update the password in the database
        const updateSql = 'UPDATE admins SET password = ? WHERE token = ?';
        db.query(updateSql, [newPassword, token], (err, result) => {
            if (err) {
                console.error('Error updating password:', err);
                return res.status(500).json({ error: 'Failed to update password.' });
            }

            res.status(200).json({ message: 'Password updated successfully.' });
        });
    });
});


// Route to get settings
app.get('/get-settings', (req, res) => {
    // Query to fetch settings
    const settingsQuery = `
        SELECT 
            whatsapp_link, 
            phone_number, 
            commission_value ,
            app_version
        FROM settings
    `;

    // Query to fetch the default value of `limitPlaces` from the `users` table
    const defaultLimitQuery = `
        SELECT COLUMN_DEFAULT
        FROM information_schema.COLUMNS
        WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'limitPosts'
    `;

    // Execute both queries
    db.query(settingsQuery, (err, settingsResults) => {
        if (err) {
            console.error('Error fetching settings:', err);
            return res.status(500).json({ error: 'Failed to fetch settings.' });
        }

        db.query(defaultLimitQuery, (err, defaultLimitResults) => {
            if (err) {
                console.error('Error fetching default limitPlaces:', err);
                return res.status(500).json({ error: 'Failed to fetch default limitPlaces.' });
            }

            if (settingsResults.length > 0 && defaultLimitResults.length > 0) {
                const settings = settingsResults[0];
                const defaultLimitPlaces = defaultLimitResults[0].COLUMN_DEFAULT;

                // Add the defaultLimitPlaces to the response
                res.status(200).json({
                    ...settings,
                    defaultLimitPlaces,
                });
            } else {
                res.status(404).json({ error: 'No settings or default limit found.' });
            }
        });
    });
});


// Route to get settings
app.get('/get-settings-admin', (req, res) => {
    // Query to fetch settings
    const settingsQuery = `
        SELECT 
            whatsapp_link, 
            phone_number, 
            commission_value ,
            app_version
        FROM settings
    `;

    // Query to fetch the default value of `limitPlaces` from the `users` table
    const defaultLimitQuery = `
        SELECT COLUMN_DEFAULT
        FROM information_schema.COLUMNS
        WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'limitPosts'
    `;

    // Execute both queries
    db.query(settingsQuery, (err, settingsResults) => {
        if (err) {
            console.error('Error fetching settings:', err);
            return res.status(500).json({ error: 'Failed to fetch settings.' });
        }

        db.query(defaultLimitQuery, (err, defaultLimitResults) => {
            if (err) {
                console.error('Error fetching default limitPlaces:', err);
                return res.status(500).json({ error: 'Failed to fetch default limitPlaces.' });
            }

            if (settingsResults.length > 0 && defaultLimitResults.length > 0) {
                const settings = settingsResults[0];
                const defaultLimitPlaces = defaultLimitResults[0].COLUMN_DEFAULT;

                // Add the defaultLimitPlaces to the response
                res.status(200).json({
                    ...settings,
                    defaultLimitPlaces,
                });
            } else {
                res.status(404).json({ error: 'No settings or default limit found.' });
            }
        });
    });
});






app.post('/api/services', upload.single('icon'), (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No icon uploaded' });
  }

  const { title, description, required_list, is_car_service , LinkWts , phone} = req.body;

  // Paths for temp and final destination
  const tempFilePath = path.join(__dirname, 'uploads', 'temp', file.filename);
  const iconsFilePath = path.join(__dirname, 'uploads', 'icons', file.filename);

  // Move the uploaded icon to the icons directory
  fs.rename(tempFilePath, iconsFilePath, (err) => {
    if (err) {
      console.error('Error moving file to icons directory:', err);
      return res.status(500).json({ error: 'Could not move file' });
    }

    const filePath = `${file.filename}`; // Store just the filename in the database

    // Prepare query to insert the service data into the database
    const query = `
      INSERT INTO services (title, description, icon, required_list, is_car_service , wtsLink , phone)
      VALUES (?, ?, ?, ?, ? ,? , ?)
    `;

    // Format required_list as a JSON string
    const formattedRequiredList = required_list ? JSON.stringify(required_list) : '[]';

    db.query(
      query,
      [title, description, filePath, formattedRequiredList, is_car_service , LinkWts , phone],
      (err, result) => {
        if (err) {
          console.error('Error inserting service data into database:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Respond with success and the inserted service data
        res.json({
          service: {
            title,
            description,
            icon: filePath,
            required_list: JSON.parse(formattedRequiredList),
            is_car_service: is_car_service === 'true',
          },
        });
      }
    );
  });
});


app.put('/api/services/:id', upload.single('icon'), (req, res) => {
  const file = req.file;
  const serviceId = req.params.id; // Get the service ID from the route params
  const { title, description, required_list, is_car_service, LinkWts, phone } = req.body;

  // Paths for temp and final destination (if icon is provided)
  let iconsFilePath;
  if (file) {
    const tempFilePath = path.join(__dirname, 'uploads', 'temp', file.filename);
    iconsFilePath = path.join(__dirname, 'uploads', 'icons', file.filename);

    // Move the uploaded icon to the icons directory
    fs.rename(tempFilePath, iconsFilePath, (err) => {
      if (err) {
        console.error('Error moving file to icons directory:', err);
        return res.status(500).json({ error: 'Could not move file' });
      }
    });
  }

  // Format required_list as a JSON string
  const formattedRequiredList = required_list ? JSON.stringify(required_list) : '[]';

  // Prepare query to update the service data in the database
  let query = `
    UPDATE services 
    SET title = ?, description = ?, required_list = ?, is_car_service = ?, wtsLink = ?, phone = ?
  `;
  const values = [title, description, formattedRequiredList, is_car_service, LinkWts, phone];

  // If an icon is uploaded, include it in the update
  if (file) {
    query += `, icon = ?`;
    values.push(file.filename); // Store just the filename
  }

  query += ` WHERE service_id = ?`; // Update only the service with the given ID
  values.push(serviceId);

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error updating service data:', err);
      return res.status(500).json({ error: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Respond with success and the updated service data
    res.json({
      service: {
        id: serviceId,
        title,
        description,
        icon: file ? file.filename : undefined, // Only include icon if updated
        required_list: JSON.parse(formattedRequiredList),
        is_car_service: is_car_service === 'true',
        LinkWts,
        phone,
      },
    });
  });
});



app.get('/places/buyOrRent/count', (req, res) => {
    const query = `
        SELECT 
            SUM(CASE WHEN buy_or_rent = 'للبيع' THEN 1 ELSE 0 END) AS forSaleCount,
            SUM(CASE WHEN buy_or_rent = 'للإيجار' THEN 1 ELSE 0 END) AS forRentCount,
            SUM(CASE WHEN buy_or_rent = 'الحجز' THEN 1 ELSE 0 END) AS reservationCount
        FROM places;
    `;

    db.query(query, (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error', details: error });
        }
        // Respond with the counts
        res.json({
            للبيع: results[0].forSaleCount || 0,
            للإيجار: results[0].forRentCount || 0,
            الحجز: results[0].reservationCount  || 0
        });
    });
});

app.get('/places/visits', (req, res) => {
    const query = `
        SELECT 
            DATE(date) AS visitDate, 
            COUNT(*) AS placeCount
        FROM places
        GROUP BY visitDate
        ORDER BY visitDate;
    `;

    db.query(query, (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error', details: error });
        }

        // Format the results into the format expected by the front end
        const labels = results.map(row => row.visitDate);
        const series = [{
            name: 'اعلانات',  // Ads in Arabic
            type: 'line',
            fill: 'solid',
            data: results.map(row => row.placeCount),
        }];

        // Respond with formatted data
        res.json({ labels, series });
    });
});
// Route to delete a service
app.delete('/api/services/:id', (req, res) => {
  const { id } = req.params;

  // First, find the service to get the icon file name
  const findServiceQuery = 'SELECT icon FROM services WHERE service_id = ?';
  db.query(findServiceQuery, [id], (err, result) => {
    if (err || result.length === 0) {
      console.error('Error finding service:', err);
      return res.status(500).json({ error: 'Service not found' });
    }

    const iconFileName = result[0].icon;
    const iconFilePath = path.join(__dirname, 'uploads', 'icons', iconFileName);

    // Delete the icon file from the server
    fs.unlink(iconFilePath, (err) => {
      if (err) {
        console.error('Error deleting icon file:', err);
      }
      
      // Proceed to delete the service from the database
      const deleteQuery = 'DELETE FROM services WHERE service_id = ?';
      db.query(deleteQuery, [id], (err, result) => {
        if (err) {
          console.error('Error deleting service from database:', err);
          return res.status(500).json({ error: 'Could not delete service' });
        }

        res.json({ message: 'Service deleted successfully' });
      });
    });
  });
});






app.get('/api/services', (req, res) => {
  const query = 'SELECT * FROM services ORDER BY created_at DESC';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching services:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ services: results });
  });
});


app.get('/api/getOnce/services/:id', (req, res) => {
  const serviceId = req.params.id;

  // Query to get the service
  const query = 'SELECT * FROM services WHERE service_id = ?';
  db.query(query, [serviceId], (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(results[0]);
  });
});


app.get('/privacy', (req, res) => {
  const query = 'SELECT privacy_ar, privacy_en FROM settings LIMIT 1';

  db.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Failed to retrieve privacy policies' });
    }
    if (results.length > 0) {
      return res.json({
        privacy_ar: results[0].privacy_ar,
        privacy_en: results[0].privacy_en
      });
    }
    res.status(404).json({ message: 'No privacy policies found' });
  });
});

// Route to get terms and conditions (terms_ar and terms_en)
app.get('/terms', (req, res) => {
  const query = 'SELECT terms_ar, terms_en FROM settings LIMIT 1';

  db.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Failed to retrieve terms and conditions' });
    }
    if (results.length > 0) {
      return res.json({
        terms_ar: results[0].terms_ar,
        terms_en: results[0].terms_en
      });
    }
    res.status(404).json({ message: 'No terms and conditions found' });
  });
});

app.get('/services/car', (req, res) => {
  // Query to get services where `is_car_service` is 1
  const query = 'SELECT * FROM services WHERE is_car_service = 1';

  db.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'خدمة السيارات غير متوفرة بعد' });
    }
    res.json(results);
  });
});

app.post('/api/report', async (req, res) => {
    const { crimeType, victimNumber, description, placeId , reportType } = req.body;

    // Validate the incoming data
    if (!crimeType || !victimNumber || !placeId) {
        return res.status(400).json({ error: 'Required fields are missing' });
    }

    const reportDate = new Date();  // Save the current date and time as the report date
    const status = 'قيد الانتظار';  // Default status in Arabic (Pending)

    try {
        const query = `INSERT INTO reports (placeId, victimNumber, reportDate, description, crimeType, status , reportType) 
                       VALUES (?, ?, ?, ?, ?, ? , ?)`;

        // Assuming `db` is your database connection (MySQL in this case)
        db.query(query, [placeId, victimNumber, reportDate, description, crimeType, status , reportType], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }

            // Return success response with the inserted report ID
            res.status(201).json({ message: 'Report created successfully', reportId: result.insertId });
        });
    } catch (err) {
        console.error('Error processing request:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// API to Get All Reports
app.get('/api/reports', (req, res) => {
  const query = `
    SELECT 
      r.reportId,
      r.reporterName,
      r.description	,
      r.crimeType,
      r.reportType,
      r.victimNumber,
      r.reportDate,
      r.status,
      r.placeId,
      CASE
        WHEN r.reportType = 'comment' THEN rev.comment
        ELSE NULL
      END AS comment
    FROM reports r
    LEFT JOIN reviews rev ON r.placeId = rev.id AND r.reportType = 'comment'
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching reports:', err);
      return res.status(500).json({ error: 'Failed to fetch reports' });
    }

    // Format the results
    const formattedResults = results.map(report => ({
      ...report,
      comment: report.reportType === 'comment' ? report.comment : null
    }));

    res.json(formattedResults);
  });
});


app.put('/reports/:reportId/status', (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const query = 'UPDATE reports SET status = ? WHERE reportId = ?';
  db.query(query, [status, reportId], (err, results) => {
    if (err) {
      console.error('Error updating report status:', err);
      return res.status(500).json({ error: 'Failed to update report status' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: 'Report status updated successfully' });
  });
});


app.put('/users/action/:userId/block', (req, res) => {
  const { userId } = req.params;
  const { reportId } = req.body; // Add reportId to the request body

  // Block the user
  const blockQuery = 'UPDATE users SET blocked = 1 WHERE id = ?';
  db.query(blockQuery, [userId], (err, results) => {
    if (err) {
      console.error('Error blocking user:', err);
      return res.status(500).json({ error: 'Failed to block user' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the report's actionFinished field
    const updateReportQuery = 'UPDATE reports SET actionFinished = 1 WHERE reportId = ?';
    db.query(updateReportQuery, [reportId], (err, results) => {
      if (err) {
        console.error('Error updating report:', err);
        return res.status(500).json({ error: 'Failed to update report' });
      }

      res.json({ message: 'User blocked and report updated successfully' });
    });
  });
});


app.put('/places/:placeId/stop', (req, res) => {
  const { placeId } = req.params;
  const { reportId } = req.body; // Add reportId to the request body

  // Stop the place
  const stopQuery = 'UPDATE places SET approved = 0 WHERE id = ?';
  db.query(stopQuery, [placeId], (err, results) => {
    if (err) {
      console.error('Error stopping place:', err);
      return res.status(500).json({ error: 'Failed to stop place' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }

    // Update the report's actionFinished field
    const updateReportQuery = 'UPDATE reports SET actionFinished = 1 WHERE reportId = ?';
    db.query(updateReportQuery, [reportId], (err, results) => {
      if (err) {
        console.error('Error updating report:', err);
        return res.status(500).json({ error: 'Failed to update report' });
      }

      res.json({ message: 'Place stopped and report updated successfully' });
    });
  });
});



app.delete('/comments/:reviewId', (req, res) => {
  const { reviewId } = req.params;
  const { reportId } = req.body; // Add reportId to the request body

  // Delete the review
  const deleteQuery = 'DELETE FROM reviews WHERE id = ?';
  db.query(deleteQuery, [reviewId], (err, results) => {
    if (err) {
      console.error('Error deleting review:', err);
      return res.status(500).json({ error: err });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Delete the report
    const deleteReportQuery = 'DELETE FROM reports WHERE id = ?'; // Corrected query
    db.query(deleteReportQuery, [reportId], (err, results) => {
      if (err) {
        console.error('Error deleting report:', err);
        return res.status(500).json({ error: 'Failed to delete report' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json({ message: 'Review and report deleted successfully' });
    });
  });
});


// reviews 

app.get('/reviews/:place_id', (req, res) => {
    const { place_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const query = `
        SELECT r.id, u.name, u.id AS user_id, u.picture_url AS avatar, u.image_name, r.rating, r.comment, r.created_at
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.place_id = ?
        ORDER BY r.created_at DESC;

    `;
    const summaryQuery = `
        SELECT COUNT(*) AS total_reviews, AVG(rating) AS average_rating
        FROM reviews
        WHERE place_id = ?;
    `;
    const ratingBreakdownQuery = `
        SELECT rating, COUNT(*) AS count
        FROM reviews
        WHERE place_id = ?
        GROUP BY rating
        ORDER BY rating DESC;
    `;

    // Get reviews
    db.query(query, [place_id, pageSize, offset], (err, results) => {
        if (err) {
            console.error("Error fetching reviews:", err);
            return res.status(500).send(err);
        }

        // Get summary (total reviews and average rating)
        db.query(summaryQuery, [place_id], (summaryErr, summaryResults) => {
            if (summaryErr) {
                console.error("Error fetching summary:", summaryErr);
                return res.status(500).send(summaryErr);
            }

            // Get rating breakdown
            db.query(ratingBreakdownQuery, [place_id], (ratingErr, ratingResults) => {
                if (ratingErr) {
                    console.error("Error fetching rating breakdown:", ratingErr);
                    return res.status(500).send(ratingErr);
                }

                const ratingBreakdown = [5, 4, 3, 2, 1].map((rating) => {
                    const ratingData = ratingResults.find(r => r.rating === rating);
                    return ratingData ? ratingData.count : 0;
                });

                const averageRating = summaryResults[0]?.average_rating || 0; // Fallback to 0 if null
                const totalReviews = summaryResults[0]?.total_reviews || 0; // Fallback to 0 if null

                const mainReviewData = {
                    reviews: results,
                    total_reviews: totalReviews,
                    average_rating: averageRating.toFixed(1),
                    rating_breakdown: ratingBreakdown
                };

                res.json(mainReviewData);
            });
        });
    });
});


// Route to add a review
app.post('/reviews/add', (req, res) => {
  const { place_id, user_id, comment, rating } = req.body;

  // Validate input fields
  if (!place_id || !user_id || !comment || !rating) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // SQL query to insert review into the `reviews` table
  const insertQuery = 'INSERT INTO reviews (place_id, user_id, comment, rating) VALUES (?, ?, ?, ?)';
  db.query(insertQuery, [place_id, user_id, comment, rating], (err, result) => {
    if (err) {
      console.error('Error inserting review:', err);
      return res.status(500).json({ error: 'Error adding review' });
    }

    const reviewId = result.insertId;

    // SQL query to fetch the newly added review with user details
    const query = `
      SELECT 
        r.id, 
        u.name, 
        u.picture_url AS avatar, 
        u.image_name, 
        r.rating, 
        r.comment, 
        r.created_at 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.id = ?;`;
    db.query(query, [reviewId], (err, rows) => {
      if (err) {
        console.error('Error fetching review:', err);
        return res.status(500).json({ error: 'Error retrieving the added review' });
      }
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }

      // Fetch the ownerId of the place from the places table
      const fetchOwnerQuery = 'SELECT owner_id FROM places WHERE id = ?';
      db.query(fetchOwnerQuery, [place_id], (fetchErr, ownerRows) => {
        if (fetchErr) {
          console.error('Error fetching place owner:', fetchErr);
          return res.status(500).json({ error: 'Error retrieving place owner' });
        }
        if (ownerRows.length === 0) {
          return res.status(404).json({ error: 'Place not found' });
        }

        const ownerId = ownerRows[0].ownerId;

        // Prepare notification data
        const notificationData = {
          title: `تعليق جديد على منشور رقم ${place_id}`,
          message: comment,
          redirectId: place_id, // This could be a post ID or user ID depending on redirectType
          redirectType: "post", // Could be 'post', 'user', or any other type you define
          userId: ownerId, // The ID of the user who will receive the notification (owner of the place)
          fromId: user_id // The ID of the user who sent the notification
        };

        // Send notification
        sendNotification(notificationData, (notificationErr, notificationResult) => {
          if (notificationErr) {
            console.error("Error sending notification:", notificationErr.message);
          }

          // Return the newly added review with additional data
          res.status(200).json({
            message: 'Review added successfully',
            review: rows[0], // The first (and only) row will contain the new review
          });
        });
        
        
      });
    });
  });
});

app.post('/follow/user', async (req, res) => {
    const { followerId, followeeId, isFollowing } = req.body;

    if (!followerId || !followeeId) {
        return res.status(400).json({ message: 'Both followerId and followeeId are required' });
    }

    try {
        if (isFollowing) {
            // Follow logic
            const followQuery = `
                INSERT INTO followers (follower_id, followee_id)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`;
            
            await new Promise((resolve, reject) => {
                db.query(followQuery, [followerId, followeeId], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            // Get user details for notification
            const [follower] = await new Promise((resolve, reject) => {
                db.query('SELECT name FROM users WHERE id = ?', [followerId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });

            // Get followee's notification token
            const [followee] = await new Promise((resolve, reject) => {
                db.query('SELECT notificationToken FROM users WHERE id = ?', [followeeId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });

            // Create notification message
            const notificationMessage = `لديك متابع جديد: ${follower.name}`;

            // Insert notification
            const notificationQuery = `
                INSERT INTO notifications 
                    (title, message, user_id, from_id, profileId)
                VALUES (?, ?, ?, ?, ?)`;
            
            await new Promise((resolve, reject) => {
                db.query(notificationQuery, [
                    'متابعة جديدة',
                    notificationMessage,
                    followeeId,   // user_id (receiver)
                    followerId,   // from_id (sender)
                    followerId    // profile_id (follower's profile)
                ], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            // Send push notification
            if (followee.notificationToken) {
                const messages = [{
                    to: followee.notificationToken,
                    sound: 'default',
                    title: 'متابعة جديدة',
                    body: notificationMessage,
                    data: { profileId: followerId }
                }];

                await expo.sendPushNotificationsAsync(messages);
            }

            return res.status(200).json({ 
                message: 'تم المتابعة بنجاح', 
                isFollowing: true 
            });

        } else {
            // Unfollow logic
            const unfollowQuery = `
                DELETE FROM followers
                WHERE follower_id = ? AND followee_id = ?`;
            
            await new Promise((resolve, reject) => {
                db.query(unfollowQuery, [followerId, followeeId], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            return res.status(200).json({ 
                message: 'تم إلغاء المتابعة بنجاح', 
                isFollowing: false 
            });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            message: 'حدث خطأ في الخادم',
            error: error.message 
        });
    }
});


// Route to get user profile data
app.get('/user/:userId', (req, res) => {
  const userId = req.params.userId;
  const myId = req.headers.authorization?.split(' ')[1]; // Extract user ID from Authorization header

  if (!myId) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }

  // Query to fetch user profile details
  const userProfileQuery = `
    SELECT 
      u.id,
      u.name,
      u.picture_url,
      u.image_name,
      u.trustable,
      u.description,
      (SELECT COUNT(*) FROM followers WHERE followee_id = u.id) AS followersCount,
      (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) AS followingCount,
      EXISTS (
        SELECT 1 FROM followers WHERE follower_id = ? AND followee_id = u.id
      ) AS isFollowing
    FROM users u
    WHERE u.id = ?;
  `;

  // Query to fetch user posts
const userPostsQuery = `
    SELECT id, title, photos, sponsored, address, price, buy_or_rent, folderName
    FROM places 
    WHERE owner_id = ? 
    AND approved = 1 
    AND active = 1;
`;

  // Execute both queries
  db.query(userProfileQuery, [myId, userId], (err, userResults) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      return res.status(500).json({ error: err });
    }

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found', userid: userId });
    }

    const userProfile = userResults[0];

    db.query(userPostsQuery, [userId], (err, postResults) => {
      if (err) {
        console.error('Error fetching user posts:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      res.json({
        id: userProfile.id,
        name: userProfile.name,
        image_name: userProfile.image_name,
        picture_url: userProfile.picture_url,
        trustable: userProfile.trustable,
        avatar: userProfile.avatar,
        description: userProfile.description,
        followersCount: userProfile.followersCount,
        followingCount: userProfile.followingCount,
        isFollowing: !!userProfile.isFollowing,
        places: postResults // Return all places in a single array
      });
    });
  });
});

app.post('/requests', async (req, res) => {
  try {
    const {
      requestType,
      propertyType,
      city,
      district,
      details,
      budget,
      paymentMethod,
      area,
      name,
      phone,
      userType
    } = req.body;

    // Validate required fields
    if (!requestType || !propertyType || !city || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Combine city and district into a single string for the city column
    const combinedCity = district ? `${city}, ${district}` : city;

    // Insert into database using your preferred MySQL approach
    const query = `
      INSERT INTO property_requests 
      (request_type, property_type, city, details, 
       budget_min, budget_max, payment_method, 
       area_min, area_max, name, phone, user_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      requestType,
      propertyType,
      combinedCity, // Now contains both city and district
      details || null,
      budget?.min || null,
      budget?.max || null,
      paymentMethod || null,
      area?.min || null,
      area?.max || null,
      name,
      phone,
      userType || 'buyer'
    ];

    // Using your preferred MySQL query method
    db.query(query, values, (error, results) => {
      if (error) {
        console.error('Database error:', error);
        return res.status(500).json(error);
      }
      
      res.json({
        success: true,
        message: 'Request submitted successfully',
        requestId: results.insertId
      });
    });

  } catch (error) {
    console.error('Error submitting request:', error);
    res.status(500).json(error);
  }
});


app.post('/user/interests', async (req, res) => {
  try {
    const { userId, interests, city, district } = req.body;

    // Validate required fields
    if (!userId || !interests || !Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User identifier and interests are required'
      });
    }

    // Combine city and district into a single string
    const location = district ? `${city},${district}` : city;

    // Delete existing interests for this user
    const deleteQuery = 'DELETE FROM user_interests WHERE user_id = ?';
    
    db.query(deleteQuery, [userId], (error) => {
      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ success: false, error });
      }

      // If no interests to insert, just return success
      if (interests.length === 0) {
        return res.json({ 
          success: true, 
          message: 'Interests cleared successfully',
          interestsCount: 0
        });
      }

      // Create placeholders for multiple rows
      const placeholders = interests.map(() => '(?, ?, ?)').join(', ');
      
      // Flatten the values array
      const flattenedValues = [];
      interests.forEach(interest => {
        flattenedValues.push(userId, interest, location);
      });

      // Insert new interests
      const insertQuery = `INSERT INTO user_interests (user_id, interest, city) VALUES ${placeholders}`;
      
      db.query(insertQuery, flattenedValues, (error, results) => {
        if (error) {
          console.error('Database error:', error);
          return res.status(500).json({ success: false, error });
        }

        res.json({ 
          success: true, 
          message: 'Interests and location saved successfully',
          interestsCount: results.affectedRows
        });
      });
    });
  } catch (error) {
    console.error('Error saving interests:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});



// API endpoint to get requests matching user interests and location
app.post('/user/matching-requests', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }
    
    // First get user interests and location
    const getUserInterestsQuery = `
      SELECT interest, city, district 
      FROM user_interests 
      WHERE user_id = ?
    `;
    
    db.query(getUserInterestsQuery, [userId], (error, userInterests) => {
      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (userInterests.length === 0) {
        return res.json({ 
          success: true, 
          message: 'No interests found for user',
          requests: [] 
        });
      }
      
      // Extract user's interests and location
      const interests = [...new Set(userInterests.map(item => item.interest))];
      const userCity = userInterests[0].city;
      const userDistrict = userInterests[0].district;
      
      // Build query to find matching requests
      let query = `
        SELECT * FROM property_requests 
        WHERE property_type IN (?) 
        OR city LIKE ? 
        OR city LIKE ?
      `;
      
      let queryParams = [
        interests,
        `%${userCity}%`,
        `%${userDistrict}%`
      ];
      
      // If user has both city and district, add more specific search
      if (userCity && userDistrict) {
        query += ` OR city LIKE ?`;
        queryParams.push(`%${userCity},%${userDistrict}%`);
      }
      
      query += ` ORDER BY created_at DESC LIMIT 20`;
      
      // Execute query to find matching requests
      db.query(query, queryParams, (error, requests) => {
        if (error) {
          console.error('Database error:', error);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({ 
          success: true, 
          userInterests: interests,
          userLocation: { city: userCity, district: userDistrict },
          matchingRequests: requests
        });
      });
    });
  } catch (error) {
    console.error('Error fetching matching requests:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


// Start server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
