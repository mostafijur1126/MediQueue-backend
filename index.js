const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const app = express();
dotenv.config();
const port = process.env.PORT || 8000;
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
    // console.log(payload);
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};

async function run() {
  try {
    // await client.connect();

    const db = client.db("mediqueue");
    const tutorsCollection = db.collection("tutors");
    const bookingCollection = db.collection("bookings");

    app.post("/tutors", verifyToken, async (req, res) => {
      const tutor = req.body;
      const newTutor = {
        ...tutor,
        registrationDate: new Date(),
      };
      const result = await tutorsCollection.insertOne(newTutor);
      res.send(result);
      // console.log(tutor);
    });

    app.get("/tutorsHome", async (req, res) => {
      const result = await tutorsCollection.find().limit(6).toArray();
      res.send(result);
    });

    app.get("/tutors", async (req, res) => {
      const result = await tutorsCollection.find().toArray();
      res.send(result);
    });

    app.get("/tutors/:path", verifyToken, async (req, res) => {
      const { path } = req.params;
      const result = await tutorsCollection.findOne({
        _id: new ObjectId(path),
      });
      res.send(result);
    });

    app.get("/myTutor/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const resust = await tutorsCollection
        .find({ "user.id": userId })
        .toArray();
      res.send(resust);
    });

    app.patch("/updateTutor/:id", async (req, res) => {
      const { id } = req.params;
      const updateTutor = req.body;
      const result = await tutorsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: updateTutor,
        },
      );
      res.send(result);
      // console.log("id", id, "userinfo", updateTutor);
    });

    app.delete("/myTutor/:id", async (req, res) => {
      const { id } = req.params;
      const result = await tutorsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.post("/bookings", verifyToken, async (req, res) => {
      const bookingData = req.body;
      const tutorId = bookingData.tutorId;

      const tutor = await tutorsCollection.findOne({
        _id: new ObjectId(tutorId),
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sessionDate = new Date(tutor.sessionStartDate);
      sessionDate.setHours(0, 0, 0, 0);
      if (today > sessionDate) {
        return res.status(400).json({
          success: false,
          message: "Booking is not availalble yet for this tutor.",
        });
      }

      if (!tutor || Number(tutor.totalSlots) <= 0) {
        return res.status(400).send({
          message: "No available slots.",
        });
      }

      const existingBooking = await bookingCollection.findOne({
        _id: new ObjectId(tutorId),
      });
      // console.log(existingBooking);
      if (existingBooking) {
        return res.status(400).send({
          message: "You have already booked this tutor.",
        });
      }

      const newBooking = {
        ...tutor,
        user: bookingData,
        status: "booked",
      };
      const bookingResult = await bookingCollection.insertOne(newBooking);

      await tutorsCollection.updateOne(
        { _id: new ObjectId(tutorId) },
        { $inc: { totalSlots: -1 } },
      );
      res.send({
        success: true,
        message: "Booking Successrul.",
        bookingResult,
      });
    });

    app.get("/booking", verifyToken, async (req, res) => {
      const { email } = req.query;
      // console.log(email);
      const result = await bookingCollection
        .find({ "user.email": email })
        .toArray();
      res.send(result);
    });

    app.patch("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "Cancelled",
          },
        },
      );
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
