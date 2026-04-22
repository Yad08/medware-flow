# MedWare Logistics

MedWare Logistics is a full-stack web application designed to modernize inventory and shipment management for nonprofit medical supply organizations.

This project was developed as part of a university Information Systems course (INSY 4325) and serves as a practical implementation of full-stack system design, database modeling, and user interface development.

---

## 📌 Project Background

This project was inspired by a real-world idea discussed within our team: a nonprofit-style medical supply operation that relies heavily on outdated, paper-based processes to track inventory and shipments.

We used this concept as a use case to design and build a digital solution that addresses key operational challenges such as:
- Lack of inventory accountability
- Data inaccuracy
- Poor organization
- No reliable data backup system

The system models a warehouse workflow where medical supplies are received, organized, and shipped globally to those in need.

---

## 🎯 Purpose

The goal of MedWare Logistics is to replace manual workflows with a structured, easy-to-use digital platform that allows users to:

- Track incoming inventory
- Organize items into pallets
- Group pallets into shipping containers
- Generate reports for shipments and inventory
- Improve operational efficiency and accuracy

---

## 🧱 System Overview

The application is built around a real-world logistics model:

**Items → Pallets → Containers → Reports**

- **Items** represent individual or bulk medical supplies  
- **Pallets** group items for organization  
- **Containers** group pallets for shipment  
- **Reports** provide detailed manifests for accountability  

This structure reflects standard warehouse and shipping practices :contentReference[oaicite:0]{index=0}.

---

## 🧑‍💻 Features

- Inventory Management (add, edit, delete items)
- Pallet Creation and Management
- Shipment / Container Organization
- Report Generation (Pallet & Container Reports)
- Analytics Dashboard (inventory and shipment insights)
- CSV/Excel Import for bulk inventory intake
- PIN-based Authentication (Employee & Volunteer roles)

---

## 🗄️ Tech Stack

- **Frontend:** React + Tailwind CSS  
- **Backend:** Supabase (PostgreSQL)  
- **Architecture:** Full-stack web application  
- **Data Handling:** Real-time database integration  

---

## 👥 User Roles

- **Employee**
  - Full system access
  - Manages inventory, pallets, containers, and reports

- **Volunteer**
  - Limited access
  - Assists with inventory entry and basic operations

---

## 📊 Academic Context

This project fulfills the requirements of a semester-long Information Systems project, which includes:

- Problem domain analysis  
- UI/UX design  
- Class diagram modeling  
- Database (ERD) design  
- Full implementation of a working system :contentReference[oaicite:1]{index=1}  

---

## 🚀 Future Improvements

- Full authentication system with secure credentials
- Advanced analytics and forecasting
- Barcode scanning for inventory
- Role-based permissions expansion
- Mobile optimization

---

## 🤝 Team

Developed by:

- Yusuf Dirir  
- Justin Overman  
- Josh Nguyen  
- Rick Tieu  
- Chris Huynh  

---

## ⚠️ Disclaimer

This is a class project created for educational purposes.  
It is not currently deployed for real-world production use.

---

## 📬 Contact

For questions or collaboration, feel free to reach out through GitHub.
