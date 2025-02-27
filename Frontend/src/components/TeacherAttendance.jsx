import React, { useState } from "react";
import { 
  Users, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Upload,
  Download,
  Globe,
  FileSpreadsheet,
  ArrowLeft
} from "lucide-react";
import * as XLSX from 'xlsx';
const baseurl = import.meta.env.VITE_BASE_URL;

const TeacherAttendance = () => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mode, setMode] = useState("");
  const [error, setError] = useState("");

  const classes = [
    { id: "1", name: "10A" },
    { id: "2", name: "10B" },
    { id: "3", name: "9A" },
    { id: "4", name: "9B" },
    { id: "5", name: "8A" },
    { id: "6", name: "8B" },
  ];

  const fetchStudents = async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${baseurl}/students/getstudents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class: selectedClass })
      });
      const data = await response.json();
      setStudents(data.studentList || []);
      const initialAttendance = data.studentList.reduce((acc, student) => ({
        ...acc,
        [student._id]: false
      }), {});
      setAttendance(initialAttendance);
    } catch (error) {
      setError("Failed to fetch students. Please try again.");
      console.error("Error fetching students:", error);
    }
    setIsLoading(false);
  };

  const handleAttendanceChange = (studentId) => {
    setAttendance(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const markAll = (status) => {
    const updatedAttendance = students.reduce((acc, student) => ({
      ...acc,
      [student._id]: status
    }), {});
    setAttendance(updatedAttendance);
  };

  const downloadTemplate = () => {
    const template = students.map(student => ({
      'Roll No': student.roll_no,
      'Name': student.name,
      'Attendance': '',
      'Date': selectedDate.toISOString().split('T')[0]
    }));

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `attendance_template_${selectedClass}_${selectedDate.toISOString().split('T')[0]}.xlsx`);
  };

  // Updated handleFileUpload to include normalization logic (provided in a previous update)
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    // Helper function to normalize attendance value
    const normalizeAttendance = (value) => {
      const trimmed = value ? value.toString().trim().toLowerCase() : "";
      if (trimmed === "present" || trimmed === "p") {
        return true;
      }
      if (trimmed === "absent" || trimmed === "a") {
        return false;
      }
      return false;
    };

    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const attendanceData = jsonData.reduce((acc, row) => {
        const student = students.find(s => s.roll_no === row['Roll No']);
        if (student) {
          acc[student._id] = normalizeAttendance(row['Attendance']);
        }
        return acc;
      }, {});

      setAttendance(attendanceData);
      await submitAttendance(attendanceData);
    };

    reader.readAsArrayBuffer(file);
  };

  const submitAttendance = async (attendanceData = attendance) => {
    setIsSubmitting(true);
    setError("");
    try {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const data = {
        classId: selectedClass,
        attendance: Object.entries(attendanceData).map(([studentId, isPresent]) => ({
          studentId,
          date: formattedDate,
          isPresent
        }))
      };

      await fetch(`${baseurl}/students/addattendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      setError("Failed to submit attendance. Please try again.");
      console.error("Error submitting attendance:", error);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">Student Attendance</h1>
            </div>
            {mode && (
              <button
                onClick={() => setMode("")}
                className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <select 
              className="flex-1 h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setSelectedClass(e.target.value)}
              value={selectedClass}
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name}>{cls.name}</option>
              ))}
            </select>
            
            <button 
              onClick={fetchStudents}
              disabled={!selectedClass || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : "Get Students"}
            </button>
          </div>

          {selectedClass && students.length > 0 && !mode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button
                onClick={() => setMode("live")}
                className="p-8 border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 flex flex-col items-center gap-4 group"
              >
                <Globe className="w-12 h-12 text-blue-600 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <div className="font-semibold text-lg mb-1">Mark Live Attendance</div>
                  <div className="text-sm text-gray-600">Take attendance in real-time</div>
                </div>
              </button>
              <button
                onClick={() => setMode("excel")}
                className="p-8 border-2 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-300 flex flex-col items-center gap-4 group"
              >
                <FileSpreadsheet className="w-12 h-12 text-green-600 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <div className="font-semibold text-lg mb-1">Upload Excel File</div>
                  <div className="text-sm text-gray-600">Import attendance from Excel</div>
                </div>
              </button>
            </div>
          )}

          {mode && (
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-gray-600" />
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          )}

          {mode === "excel" && (
            <div className="space-y-6">
              <button
                onClick={downloadTemplate}
                className="w-full px-4 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 flex items-center justify-center gap-3 font-medium"
              >
                <Download className="w-5 h-5" />
                Download Attendance Template
              </button>
              {/* Helpful message regarding case insensitivity */}
              <p className="text-sm text-gray-600 text-center">
                Note: The attendance field is not case sensitive. You may enter "p" or "present" for present and "a" or "absent" for absent.
              </p>

              {isSubmitting ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <span className="font-medium text-gray-800">Processing file, please wait...</span>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-all duration-300">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                      <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-800">Upload Attendance File</span>
                    <span className="text-sm text-gray-600">Click to select your Excel file</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {mode === "live" && students.length > 0 && (
            <div className="space-y-6">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => markAll(true)}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-all duration-300 flex items-center font-medium"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark All Present
                </button>
                <button
                  onClick={() => markAll(false)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-all duration-300 flex items-center font-medium"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark All Absent
                </button>
              </div>

              <div className="space-y-3">
                {students.map((student) => (
                  <div
                    key={student._id}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-300"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-600">Roll No: {student.roll_no}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attendance[student._id] || false}
                        onChange={() => handleAttendanceChange(student._id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                      <span className={`ml-3 text-sm font-medium ${attendance[student._id] ? 'text-green-600' : 'text-red-600'}`}>
                        {attendance[student._id] ? 'Present' : 'Absent'}
                      </span>
                    </label>
                  </div>
                ))}
              </div>

              <button
                onClick={() => submitAttendance()}
                disabled={isSubmitting}
                className="w-full px-4 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : "Submit Attendance"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-[slideIn_0.3s_ease-out]">
          <CheckCircle className="w-5 h-5" />
          Attendance submitted successfully!
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;
