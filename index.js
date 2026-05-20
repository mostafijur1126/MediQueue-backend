const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const app = express();
dotenv.config();
const port = process.env.PORT || 8000;
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("mediqueue");
    const tutorsCollection = db.collection("tutors");
    const bookingCollection = db.collection("bookings");

    app.post("/tutors", async (req, res) => {
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

    app.get("/tutors/:path", async (req, res) => {
      const { path } = req.params;
      const result = await tutorsCollection.findOne({
        _id: new ObjectId(path),
      });
      res.send(result);
    });

    app.get("/myTutor/:userId", async (req, res) => {
      const { userId } = req.params;
      const resust = await tutorsCollection
        .find({ "user.id": userId })
        .toArray();
      res.send(resust);
    });

    app.post("/bookings", async (req, res) => {
      const bookingData = req.body;
      const tutorId = bookingData.tutorId;

      const tutor = await tutorsCollection.findOne({
        _id: new ObjectId(tutorId),
      });

      // if (!tutor || Number(tutor.totalSlots) <= 0) {
      //   return res.status(400).send({
      //     message: "No available slots.",
      //   });
      // }

      // const existingBooking = await bookingCollection.findOne({
      //   tutorId: new ObjectId(tutorId),
      //   "user.id": bookingData.user.id,
      // });
      // if (existingBooking) {
      //   return res.status(400).send({
      //     message: "You have already booked this tutor.",
      //   });
      // }

      const newBooking = {
        ...tutor,
        user: bookingData,
        status: "booked",
      };
      console.log(newBooking);
      // const newBooking = {
      //   tutorId: new ObjectId(tutorId),
      //   userId: userId,
      //   createdAt: new Date(),
      //   status: "booked",
      // };

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

    app.get("/booking", async (req, res) => {
      const result = await bookingCollection.find().toArray();
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

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
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
