import axios from "axios";
import { useState } from "react";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setLoading(true);

    const apiURL = process.env.REACT_APP_API_GATEWAY_URL;
    const email = event.target.email.value;
    const inputFile = event.target.input_file.files[0];

    const allowedFileTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf"
    ];

    // Check if the uploaded file type is supported
    if (!allowedFileTypes.includes(inputFile.type)) {
      toast.error("Unsupported file type! Allowed types are JPEG, PNG, PDF");
      setLoading(false);
      return;
    }

    axios // 1. Send a request to API Gateway/Lambda to get a pre-signed S3 URL.
      .post(apiURL, {
        fileName: inputFile.name,
        email: email,
        fileType: inputFile.type,
      })
      .then(function (response) {
        console.log(response);

        if (response.data.preSignedURL) {
          // Upload file directly to S3 using pre-signed URL
          axios.put(response.data.preSignedURL, inputFile, {
            headers: {
              "Content-Type": inputFile.type,
              "x-amz-tagging": `email=${email}`,  // Send email as a tag
            },
          })
            .then(function (uploadResponse) {
              console.log(uploadResponse);
              toast.success(
                "Your document is being processed. The generated file links will be emailed to " + email
              );
            })
            .catch(function (uploadError) {
              console.error("File upload error:", uploadError);
              toast.error("Something went wrong while uploading the file! Please try again.");
            });
        } else {
          console.log("Pre-signed URL is null.");
          toast.warning("The email provided is not verified. Please verify the email and resubmit.");
        }
      })
      .catch(function (error) {
        console.log(error);
        toast.error("Something went wrong! Please try again later.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="App flex flex-col justify-center items-center bg-gray-500">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <h1 className="text-white text-4xl mb-0 font-bold">
        Document Text Extraction Tool
      </h1>
      <h1 className="text-white text-lg mb-6">
        Upload your JPEG, PNG, PDF files to extract text. You will receive an email with download links for the processed files.
      </h1>
      <form
        onSubmit={(e) => handleSubmit(e)}
        className="bg-white p-8 rounded shadow-md"
      >
        <div className="mb-6">
          <label
            htmlFor="input_file"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Upload File
          </label>
          <input
            id="input_file"
            name="input_file"
            type="file"
            required
            className="block w-full text-sm file:mr-4 file:rounded-l-md border rounded-md border-gray-300 file:border-0 file:bg-gray-500 file:py-2 file:px-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-700 focus:outline-none"
          />
          <p className="mt-1 text-sm text-gray-500">
            Allowed file types: JPEG, PNG, PDF
          </p>
        </div>

        <div className="mb-6">
          <label
            htmlFor="email"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-black"
          >
            Email to receive download links
          </label>
          <input
            type="email"
            id="email"
            className="bg-gray-50 border border-gray-300 text-gray-400 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="example@gmail.com"
            required
          />
        </div>

        <div className="flex flex-row justify-between">
          <input
            type="reset"
            name="reset"
            value="Reset"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          />
          <button
            type="submit"
            name="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:bg-blue-300"
          >
            {loading ? "Processing..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;
