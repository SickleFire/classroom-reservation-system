-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: classroom_reservations
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `availability`
--

DROP TABLE IF EXISTS `availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `availability` (
  `is_available` tinyint(1) NOT NULL,
  PRIMARY KEY (`is_available`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `availability`
--

LOCK TABLES `availability` WRITE;
/*!40000 ALTER TABLE `availability` DISABLE KEYS */;
INSERT INTO `availability` VALUES (0),(1);
/*!40000 ALTER TABLE `availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category` varchar(50) NOT NULL,
  PRIMARY KEY (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES ('Computer Lab'),('Lecture Room'),('Multimedia Room'),('Sound Engineering Room');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `classrooms`
--

DROP TABLE IF EXISTS `classrooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `classrooms` (
  `classroomID` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  `BYOD` tinyint(1) DEFAULT NULL,
  `category` varchar(50) NOT NULL,
  `is_available` tinyint(1) NOT NULL,
  PRIMARY KEY (`classroomID`),
  KEY `category` (`category`),
  KEY `is_available` (`is_available`),
  CONSTRAINT `classrooms_ibfk_1` FOREIGN KEY (`category`) REFERENCES `categories` (`category`),
  CONSTRAINT `classrooms_ibfk_2` FOREIGN KEY (`is_available`) REFERENCES `availability` (`is_available`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `classrooms`
--

LOCK TABLES `classrooms` WRITE;
/*!40000 ALTER TABLE `classrooms` DISABLE KEYS */;
INSERT INTO `classrooms` VALUES (1,'Room 101','Main lecture room',0,'Lecture Room',1),(2,'Room 102','Multimedia equipped room',1,'Multimedia Room',1),(3,'Room 103','Sound engineering studio',0,'Sound Engineering Room',1),(4,'Lab 01','Computer laboratory',0,'Computer Lab',1),(5,'Lab 02','Computer laboratory 2',0,'Computer Lab',1);
/*!40000 ALTER TABLE `classrooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `courseID` int NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`courseID`)
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,'CCS 101','Introduction to Computing'),(2,'CCS 102','Computer Programming 1'),(3,'EMC 101','Drafting'),(4,'GEC 001','Understanding the Self'),(5,'GEC 004','Mathematics in the Modern World'),(6,'PATHFit1','Movement Competency Training'),(7,'NSTP 111','NSTP (CWTS) 1'),(8,'CCS 103','Computer Programming 2'),(9,'CCS 109','Business Application Software'),(10,'EMC 102','Introduction to Game Design and Development'),(11,'EMC 103','Freehand and Digital Drawing'),(12,'MTH 111C','Algebra and Trigonometry'),(13,'PATHFit2','Exercise-Based Fitness Activities'),(14,'NSTP 122','Civic Welfare Training Services 2'),(15,'CCS 104','Data Structures and Algorithms'),(16,'CCS 108','Computer Technical Concept'),(17,'CCS 123','Usability, HCI, and User Interaction Design'),(18,'EMC 104','Principles of 2D Animation'),(19,'EMC 105','Game Programming 1'),(20,'LIT 001','Literature in English'),(21,'MCC 212','Analytic Geometry'),(22,'PATHFit3','Dance and Fitness'),(23,'CCS 105','Information Management'),(24,'CCS 106','Applications Development and Emerging Technologies'),(25,'CCS 110','Computer Graphics Programming'),(26,'EMC 106','Script Writing and Storyboard Design'),(27,'EMC 107','Game Programming 2'),(28,'GEC 002','Readings in Philippine History'),(29,'PHY 001','Physics 1'),(30,'PATHFit4','Sports and Fitness'),(31,'EMC 108','Principles of 3D Animation'),(32,'EMC 109','Audio Design and Sound Engineering'),(33,'EMC 110','Applied Mathematics for Games'),(34,'EMC 111','Artificial Intelligence (AI) in Games'),(35,'EMC 112','EMC Professional Elective 1'),(36,'GEC 003','The Contemporary World'),(37,'GEC 005','Purposive Communication'),(38,'RES 001','Intro to Research'),(39,'EMC 113','Design and Production Process'),(40,'EMC 114','Applied Game Physics'),(41,'EMC 115','Game Networking'),(42,'EMC 116','Game Programming 3'),(43,'EMC 117','EMC Professional Elective 2'),(44,'GEC 006','Art Appreciation'),(45,'CCS 114A','Practicum 1'),(46,'CCS 119','Capstone Project 1'),(47,'CCS 122','Project Management'),(48,'EMC 118','Advanced Game Design'),(49,'EMC 119','EMC Professional Elective 3'),(50,'GEC 007','Science, Technology and Society'),(51,'GEM 001','Rizal\'s Life, Works and Writings'),(52,'CCS 121','Capstone Project 2'),(53,'CCS 115','Current Trends in IT and Seminars'),(54,'EMC 120','Game Production'),(55,'EMC 121','EMC Professional Elective 4'),(56,'CCS 114B','Practicum 2'),(57,'GEC 008','Ethics');
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `implementations`
--

DROP TABLE IF EXISTS `implementations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `implementations` (
  `implementationID` int NOT NULL AUTO_INCREMENT,
  `courseID` int NOT NULL,
  `is_onlineclass` tinyint(1) NOT NULL DEFAULT '0',
  `starttime` datetime NOT NULL,
  `endtime` datetime NOT NULL,
  `teacherID` int DEFAULT NULL,
  `studentID` varchar(30) DEFAULT NULL,
  `classroomID` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Pending',
  `requested_by` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`implementationID`),
  KEY `courseID` (`courseID`),
  KEY `classroomID` (`classroomID`),
  KEY `requested_by` (`requested_by`),
  KEY `fk_teacher_link` (`teacherID`),
  KEY `fk_student_link` (`studentID`),
  CONSTRAINT `fk_student_link` FOREIGN KEY (`studentID`) REFERENCES `students` (`studentID`),
  CONSTRAINT `fk_teacher_link` FOREIGN KEY (`teacherID`) REFERENCES `teachers` (`teacherID`),
  CONSTRAINT `implementations_ibfk_1` FOREIGN KEY (`courseID`) REFERENCES `courses` (`courseID`),
  CONSTRAINT `implementations_ibfk_3` FOREIGN KEY (`classroomID`) REFERENCES `classrooms` (`classroomID`),
  CONSTRAINT `implementations_ibfk_4` FOREIGN KEY (`requested_by`) REFERENCES `students` (`studentID`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `implementations`
--

LOCK TABLES `implementations` WRITE;
/*!40000 ALTER TABLE `implementations` DISABLE KEYS */;
INSERT INTO `implementations` VALUES (13,1,0,'2026-03-17 15:30:00','2026-03-17 18:30:00',NULL,NULL,1,'Rejected','2026001-S'),(14,3,0,'2026-03-25 16:00:00','2026-03-25 19:00:00',NULL,NULL,5,'Rejected','2026001-S'),(15,7,0,'2026-03-25 11:00:00','2026-03-25 14:00:00',NULL,NULL,3,'Rejected','2026001-S'),(16,1,0,'2026-03-25 11:00:00','2026-03-25 14:00:00',NULL,NULL,1,'Rejected','2026001-S'),(17,1,0,'2026-03-25 11:00:00','2026-03-25 14:00:00',NULL,NULL,2,'Rejected','2026001-S'),(18,1,0,'2026-03-25 11:00:00','2026-03-25 14:00:00',NULL,NULL,4,'Approved','2026001-S'),(19,1,0,'2026-03-25 11:00:00','2026-03-25 14:00:00',NULL,NULL,5,'Rejected','2026001-S'),(20,8,0,'2026-03-25 16:00:00','2026-03-25 17:00:00',NULL,NULL,1,'Approved','2026001-S'),(21,8,0,'2026-03-25 15:30:00','2026-03-25 18:30:00',NULL,NULL,2,'Rejected','2026001-S'),(22,2,0,'2026-03-25 16:00:00','2026-03-25 19:00:00',1,NULL,3,'Approved',NULL),(23,15,0,'2026-03-26 10:30:00','2026-03-26 13:30:00',NULL,'2026001-S',4,'Rejected','2026001-S');
/*!40000 ALTER TABLE `implementations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservations`
--

DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservations` (
  `room_name` text NOT NULL,
  `time` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservations`
--

LOCK TABLES `reservations` WRITE;
/*!40000 ALTER TABLE `reservations` DISABLE KEYS */;
INSERT INTO `reservations` VALUES ('606','2026-04-08'),('606','2026-04-06'),('608','2026-04-06'),('404','2026-04-08');
/*!40000 ALTER TABLE `reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `studentID` varchar(30) NOT NULL,
  `firstname` varchar(50) NOT NULL,
  `lastname` varchar(50) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `userID` int NOT NULL,
  PRIMARY KEY (`studentID`),
  KEY `userID` (`userID`),
  CONSTRAINT `students_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES ('2026001-S','sickle','fire','09947804819',2);
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teachers`
--

DROP TABLE IF EXISTS `teachers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teachers` (
  `teacherID` int NOT NULL,
  `firstname` varchar(50) NOT NULL,
  `lastname` varchar(50) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `userID` int NOT NULL,
  PRIMARY KEY (`teacherID`),
  KEY `userID` (`userID`),
  CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teachers`
--

LOCK TABLES `teachers` WRITE;
/*!40000 ALTER TABLE `teachers` DISABLE KEYS */;
INSERT INTO `teachers` VALUES (1,'random','teacher','123',3);
/*!40000 ALTER TABLE `teachers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `userID` int NOT NULL AUTO_INCREMENT,
  `fullname` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `account_created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userID`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Joshua Sarmiento','sicklefirex@gmail.com','$2b$10$etKbsAhbj9jnTkeezGDEwOr2OGeM4XDFxnaPt6834ZWtl1UC7.Niy','2026-03-22 21:36:19'),(2,'sickle fire','joshua.sarmiento216@gmail.com','$2b$10$575lLUtDPKyvx/KvL16FP.Ffm2klQgB7NErNLMYWf9gs/URqOaocq','2026-03-24 02:35:44'),(3,'random teacher','123@gmail.com','$2b$10$J96QZ9YVtdWCdy/hbWNrAOi1ftEmuj8tzZbtPeUK/n.63kj7lz1ry','2026-03-24 17:49:01');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-25 20:46:58
