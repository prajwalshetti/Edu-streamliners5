import mongoose, { Schema } from 'mongoose';

const studentEnrolledSubjectsSchema = new Schema({
    Student_name: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    Subject_name: [{
        type: String,
        required: true
    }],
});

const studentEnrolledSubjects = mongoose.model("studentEnrolledSubjects", studentEnrolledSubjectsSchema);

export default studentEnrolledSubjects;
