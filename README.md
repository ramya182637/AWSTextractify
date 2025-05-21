# Textractify

**Textractify** is an intelligent, serverless cloud application designed to automate the extraction of text from uploaded scanned documents (PNG, JPG, or PDF) and deliver the output in `.txt` and `.csv` formats via secure email. The system leverages a fully AWS-based architecture to provide a scalable, efficient, and cost-effective solution.

## 🔍 Features

- Upload scanned documents via a web interface
- Extract text and data using **Amazon Textract**
- Receive output files (.txt and .csv) through email
- Secure access via time-limited pre-signed URLs
- Continuous monitoring, logging, and error reporting
- Auto-scaling infrastructure for performance and cost-efficiency

## 🧑‍💼 Target Users

- Businesses automating invoice/form processing
- Educational institutions digitizing documents
- Healthcare providers processing prescriptions and records
- Legal firms extracting data from contracts
- Developers integrating text extraction into workflows

## 🛠️ Technology Stack

- **Frontend**: React (Dockerized) deployed via AWS Elastic Beanstalk
- **Backend**: Node.js on AWS Lambda
- **Storage**: Amazon S3 (input and output storage)
- **Text Extraction**: AWS Textract
- **API Layer**: AWS API Gateway
- **Notification**: Amazon SNS (email alerts)
- **Infrastructure as Code**: AWS CloudFormation
- **Monitoring**: Amazon CloudWatch + AWS SQS DLQ
- **Security**: AWS GuardDuty, IAM, AWS Secrets Manager

## 🔄 Flow of Execution

1. User accesses the frontend hosted on AWS Elastic Beanstalk.
2. User enters their email and selects a file (JPG, PNG, or PDF) to extract text from.
3. A request is sent to API Gateway which triggers a Lambda function to generate a pre-signed S3 upload URL.
4. The file is uploaded directly to S3 using the pre-signed URL, tagged with the email.
5. An S3 event triggers another Lambda function to start an AWS Textract job.
6. Textract processes the file and stores `.txt` and `.csv` outputs in another S3 folder.
7. The final S3 upload triggers a third Lambda function to send the results via email using Amazon SNS.
8. The email contains a shortened pre-signed download URL (valid for 1 hour).
9. CloudWatch and GuardDuty monitor and log events, with alerts and failures sent to DLQ or SNS as needed.

## 🧩 AWS Services Used

| Service | Purpose |
|--------|---------|
| AWS Lambda | Backend processing |
| Amazon S3 | File storage |
| Amazon Textract | Text extraction |
| AWS Elastic Beanstalk | Frontend hosting |
| Amazon SNS | Email notifications |
| Amazon SQS | Dead Letter Queue |
| AWS API Gateway | RESTful API |
| AWS CloudFormation | Infrastructure automation |
| Amazon CloudWatch | Monitoring and logging |
| AWS Secrets Manager | Secure API key storage |
| AWS GuardDuty | Security monitoring |

## ⚙️ Deployment Instructions

1. Upload code and dependencies to an S3 bucket.
2. Use CloudFormation to deploy infrastructure.
3. Access frontend via the Elastic Beanstalk URL.
4. Upload a PNG, JPG, or PDF file and enter an email.
5. Receive extracted text and CSV files in email.

## ✅ AWS Well-Architected Compliance

- **Security**: Encryption, IAM roles, GuardDuty
- **Reliability**: Multi-AZ, DLQs, CloudWatch
- **Operational Excellence**: Automated alerts, logging
- **Performance Efficiency**: Serverless architecture, API caching
- **Cost Optimization**: Pay-as-you-go services, S3 Intelligent-Tiering
- **Sustainability**: Efficient resource usage, green infrastructure
