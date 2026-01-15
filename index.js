require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= MONGODB ================= */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.emedy2q.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();

    const db = client.db("Learnify_DB");
    const usersCollection = db.collection("users");
    const courseCollection = db.collection("courses");
    const enrollCollection = db.collection("enrollments");

    console.log("✅ MongoDB Connected Successfully");

    /* USERS */

    app.post("/users", async (req, res) => {
      const user = req.body;
      const exists = await usersCollection.findOne({ email: user.email });
      if (exists) return res.send({ message: "User already exists" });
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const user = await usersCollection.findOne({
        email: req.params.email,
      });
      res.send(user || { exists: false });
    });

    app.patch("/users/become-instructor/:email", async (req, res) => {
      const result = await usersCollection.updateOne(
        { email: req.params.email },
        { $set: { role: "instructor" } }
      );
      res.send(result);
    });

    /*  COURSES */

    app.get("/courses", async (req, res) => {
      const result = await courseCollection.find().toArray();
      res.send(result);
    });

    app.get("/courses/:id", async (req, res) => {
      const result = await courseCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    app.post("/courses", async (req, res) => {
      try {
        const course = req.body;
        course.createdAt = new Date();
        course.enrolledCount = 0;
        course.rating = 0;
        course.isPublished = true;

        const result = await courseCollection.insertOne(course);
        res.send(result);
      } catch {
        res.status(500).send({ message: "Failed to add course" });
      }
    });

    app.get("/my-courses/:email", async (req, res) => {
      const result = await courseCollection
        .find({ "instructor.email": req.params.email })
        .toArray();
      res.send(result);
    });

    app.put("/courses/:id", async (req, res) => {
      const result = await courseCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send(result);
    });

    app.delete("/courses/:id", async (req, res) => {
      const result = await courseCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    /* ENROLL  */

    
    app.post("/enroll", async (req, res) => {
      const { courseId, studentEmail } = req.body;

      const exists = await enrollCollection.findOne({
        courseId,
        studentEmail,
      });

      if (exists) {
        return res.send({ enrolled: true });
      }

      const result = await enrollCollection.insertOne({
        courseId,
        studentEmail,
        enrolledAt: new Date(),
      });

       // get enroll ment
    app.get("/enroll/:email", async (req, res) => {
      const result = await enrollCollection
        .find({ studentEmail: req.params.email })
        .toArray();
      res.send(result);
    });


      //  increment enrolledCount
      await courseCollection.updateOne(
        { _id: new ObjectId(courseId) },
        { $inc: { enrolledCount: 1 } }
      );

      res.send(result);
    });

   
    // unenrolment
   
  } finally {
    
  }
}

run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("🚀 Learnify Server is Running");
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
