const asyncHandler = require("express-async-handler");
const Room = require("../models/roomModel");
const mongoose = require("mongoose");

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public
const getRooms = asyncHandler(async (req, res) => {
  const {
    keyword,
    city,
    district,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    owner,
  } = req.query;

  let findQuery = {};

  // 1. Keyword search (title, description)
  if (keyword) {
    findQuery.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ];
  }
  // 2. Lọc city, district
  if (city) findQuery.city = city;
  if (district) findQuery.district = district;

  // 3. Lọc theo giá
  let priceQuery = {};
  if (minPrice) priceQuery.$gte = parseFloat(minPrice);
  if (maxPrice) priceQuery.$lte = parseFloat(maxPrice);
  if (Object.keys(priceQuery).length > 0) findQuery.price = priceQuery;

  // 4. Lọc diện tích
  let areaQuery = {};
  if (minArea) areaQuery.$gte = parseFloat(minArea);
  if (maxArea) areaQuery.$lte = parseFloat(maxArea);
  if (Object.keys(areaQuery).length > 0) findQuery.area = areaQuery;

  // 5. Lọc owner
  if (owner) findQuery.owner = owner;

  // Query MongoDB
  const rooms = await Room.find(findQuery).populate(
    "owner",
    "name email phone"
  );
  res.json(rooms);
});

// @desc    Get room by ID
// @route   GET /api/rooms/:id
// @access  Public
const getRoomById = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate(
    "owner",
    "name email _id"
  );
  if (!room) {
    res.status(404);
    throw new Error("Room not found");
  }
  res.json(room);
});

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private
const createRoom = asyncHandler(async (req, res) => {
  console.log("=== CREATE ROOM REQUEST ===");
  console.log("req.body:", req.body);
  console.log("req.files:", req.files);

  try {
    // Extract image URLs from Cloudinary uploads
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      // Extract either path or secure_url depending on what Cloudinary provides
      imageUrls = req.files.map((file) => file.path || file.secure_url);
      console.log("Cloudinary image URLs:", imageUrls);
    } else {
      console.warn("No files found in the request");
    }

    // Get user ID from authenticated user
    const ownerId = req.user._id;

    // Extract data from request body
    const {
      title,
      description,
      price,
      address,
      city,
      district,
      area,
      bedrooms,
      bathrooms,
    } = req.body;

    // Process amenities
    const amenities = {};
    Object.keys(req.body).forEach((key) => {
      if (key.startsWith("amenities[") && key.endsWith("]")) {
        const amenityKey = key.substring(10, key.length - 1);
        amenities[amenityKey] = req.body[key] === "true";
      }
    });

    // Create new room with image URLs
    const roomData = {
      title,
      description,
      price: Number(price),
      address,
      city,
      district: district || "",
      area: area ? Number(area) : 0,
      bedrooms: bedrooms ? Number(bedrooms) : 0,
      bathrooms: bathrooms ? Number(bathrooms) : 0,
      amenities,
      images: imageUrls, // Save the extracted image URLs
      owner: ownerId,
    };

    console.log("Creating room with data:", {
      ...roomData,
      images:
        roomData.images.length > 0
          ? roomData.images.map((url) => url.substring(0, 30) + "...")
          : "No images",
    });

    const room = new Room(roomData);
    const createdRoom = await room.save();

    console.log("Room saved to database:", {
      id: createdRoom._id,
      title: createdRoom.title,
      images: createdRoom.images,
    });

    res.status(201).json(createdRoom);
  } catch (error) {
    console.error("Error creating room:", error);
    res
      .status(500)
      .json({ message: "Failed to create room", error: error.message });
  }
});

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private
const updateRoom = asyncHandler(async (req, res) => {
  // First check if the room exists and handle 404 if needed
  const room = await Room.findById(req.params.id);
  if (!room) {
    res.status(404);
    throw new Error("Room not found");
  }

  // Only after confirming room exists, check ownership
  if (room.owner.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("User not authorized to update this room");
  }

  const {
    title,
    description,
    price,
    address,
    city,
    district,
    area,
    bedrooms,
    bathrooms,
    location,
  } = req.body;

  // Lấy các ảnh mới (file upload), mỗi file có file.path là URL
  const newImageUrls = req.files ? req.files.map((file) => file.path) : [];

  // Lấy các URL ảnh cũ còn lại được gửi lên từ frontend (chuỗi JSON hoặc mảng)
  let existingImageUrls = [];
  if (req.body.existingImages) {
    try {
      existingImageUrls = JSON.parse(req.body.existingImages);
      if (!Array.isArray(existingImageUrls)) existingImageUrls = [];
    } catch (e) {
      existingImageUrls = [];
    }
  }

  // Cập nhật các trường với type casting tiêu chuẩn
  room.title = title !== undefined ? title : room.title;
  room.description = description !== undefined ? description : room.description;
  room.price = price !== undefined ? Number(price) : room.price;
  room.address = address !== undefined ? address : room.address;
  room.city = city !== undefined ? city : room.city;
  room.district = district !== undefined ? district : room.district;
  room.area = area !== undefined ? Number(area) : room.area;
  room.bedrooms = bedrooms !== undefined ? Number(bedrooms) : room.bedrooms;
  room.bathrooms = bathrooms !== undefined ? Number(bathrooms) : room.bathrooms;
  room.location = location !== undefined ? location : room.location;

  // Gộp danh sách ảnh: ảnh cũ còn lại + ảnh mới upload
  room.images = [...existingImageUrls, ...newImageUrls];

  const updatedRoom = await room.save();
  res.json(updatedRoom);
});

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private
const deleteRoom = asyncHandler(async (req, res) => {
  // First check if the room exists and handle 404 if needed
  const room = await Room.findById(req.params.id);
  if (!room) {
    res.status(404);
    throw new Error("Room not found");
  }

  // Only after confirming room exists, check ownership
  if (room.owner.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("User not authorized to delete this room");
  }
  await room.deleteOne();
  res.json({ message: "Room removed" });
});

// Get rooms owned by the logged-in user
const getMyRooms = asyncHandler(async (req, res) => {
  try {
    // Get the user ID directly from the token - set by protect middleware
    const userId = req.user._id;

    // Log for debugging
    console.log(`Getting rooms for authenticated user ID: ${userId}`);

    // Find only rooms owned by the currently logged-in user
    const rooms = await Room.find({ owner: userId }).populate(
      "owner",
      "name email"
    );

    console.log(`Found ${rooms.length} rooms for user ${userId}`);

    res.json(rooms);
  } catch (error) {
    console.error("Error fetching my rooms:", error);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
});

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getMyRooms,
};
