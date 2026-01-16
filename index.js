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
    console.log("✅ MongoDB Connected Successfully");

    const db = client.db("Learnify_DB");
    const usersCollection = db.collection("users");
    const courseCollection = db.collection("courses");
    const enrollCollection = db.collection("enrollments");

    /* ================= USERS ================= */

    app.post("/users", async (req, res) => {
      const user = req.body;
      const exists = await usersCollection.findOne({ email: user.email });
      if (exists) return res.send({ message: "User already exists" });

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      res.send(user || { exists: false });
    });

    app.patch("/users/become-instructor/:email", async (req, res) => {
      const result = await usersCollection.updateOne(
        { email: req.params.email },
        { $set: { role: "instructor" } }
      );
      res.send(result);
    });

    /* ================= COURSES ================= */

    app.get("/courses", async (req, res) => {
      const result = await courseCollection.find().toArray();
      res.send(result);
    });

    app.get("/courses/:id", async (req, res) => {
      const course = await courseCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(course);
    });

    //  ADD COURSE (FIXED)
    app.post("/courses", async (req, res) => {
      try {
        const course = {
          ...req.body,
          image: req.body.image, // ✅ STANDARD FIELD
          createdAt: new Date(),
          enrolledCount: 0,
          rating: 0,
          isPublished: true,
        };

        const result = await courseCollection.insertOne(course);

        //  return full course for instant UI update
        res.send({ ...course, _id: result.insertedId });
      } catch (err) {
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

    /* ================= ENROLL ================= */

    app.post("/enroll", async (req, res) => {
      const { courseId, studentEmail } = req.body;

      const exists = await enrollCollection.findOne({
        courseId,
        studentEmail,
      });
      if (exists) return res.send({ enrolled: true });

      const result = await enrollCollection.insertOne({
        courseId,
        studentEmail,
        enrolledAt: new Date(),
      });

      await courseCollection.updateOne(
        { _id: new ObjectId(courseId) },
        { $inc: { enrolledCount: 1 } }
      );

      res.send(result);
    });

    // FIXED LOCATION
    app.get("/enroll/:email", async (req, res) => {
      const result = await enrollCollection
        .find({ studentEmail: req.params.email })
        .toArray();
      res.send(result);
    });

    app.delete("/enroll/:id", async (req, res) => {
      const enrollment = await enrollCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      if (!enrollment) return res.send({ message: "Enrollment not found" });

      await enrollCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });

      await courseCollection.updateOne(
        { _id: new ObjectId(enrollment.courseId) },
        { $inc: { enrolledCount: -1 } }
      );

      res.send({ success: true });
    });

  } finally {}
}

run().catch(console.dir);

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.send("🚀 Learnify Server is Running");
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
