const asyncHandler = require("express-async-handler");
const Room = require("../models/roomModel");
const Review = require("../models/reviewModel"); // <-- Thêm dòng này

// Lấy danh sách phòng (có lọc)
const getRooms = asyncHandler(async (req, res) => {
  // Lấy thêm 'amenities' từ query
  const {
    keyword,
    city,
    district,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    owner,
    sortBy,
    amenities, // <-- THÊM amenities vào đây
  } = req.query;

  let findQuery = {};

  // Tìm kiếm theo từ khóa
  if (keyword) {
    findQuery.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
      { address: { $regex: keyword, $options: "i" } },
    ];
  }

  // Lọc theo địa điểm
  if (city) findQuery.city = city;
  if (district) findQuery.district = district;

  // Lọc theo giá
  let priceQuery = {};
  if (minPrice) priceQuery.$gte = parseFloat(minPrice);
  if (maxPrice) priceQuery.$lte = parseFloat(maxPrice);
  if (Object.keys(priceQuery).length > 0) findQuery.price = priceQuery;

  // Lọc theo diện tích
  let areaQuery = {};
  if (minArea) areaQuery.$gte = parseFloat(minArea);
  if (maxArea) areaQuery.$lte = parseFloat(maxArea);
  if (Object.keys(areaQuery).length > 0) findQuery.area = areaQuery;

  // Lọc theo chủ phòng
  if (owner) findQuery.owner = owner;

  // --- PHẦN MỚI: XỬ LÝ SẮP XẾP ---
  let sortQuery = {};
  switch (sortBy) {
    case "price_asc":
      sortQuery = { price: 1 }; // 1 là tăng dần (Ascending)
      break;
    case "price_desc":
      sortQuery = { price: -1 }; // -1 là giảm dần (Descending)
      break;
    case "area_desc":
      sortQuery = { area: -1 };
      break;
    case "area_asc":
      sortQuery = { area: 1 };
      break;
    case "rating_desc":
      sortQuery = { rating: -1 }; // Sắp xếp theo điểm đánh giá cao nhất
      break;
    case "newest":
    default:
      sortQuery = { createdAt: -1 }; // Mặc định sắp xếp theo ngày tạo mới nhất
      break;
  }
  // --- KẾT THÚC PHẦN MỚI ---

  // --- PHẦN MỚI: LỌC THEO TIỆN NGHI ---
  if (amenities) {
    // Frontend sẽ gửi lên một chuỗi các tiện nghi, cách nhau bởi dấu phẩy
    // Ví dụ: "wifi,parking"
    const amenitiesToFilter = amenities.split(",");

    // Thêm điều kiện vào query để tìm các phòng có tiện nghi=true
    // Ví dụ: { "amenities.wifi": true, "amenities.parking": true }
    amenitiesToFilter.forEach((amenity) => {
      if (amenity.trim()) {
        // Bỏ qua các giá trị rỗng
        findQuery[`amenities.${amenity.trim()}`] = true;
      }
    });
  }
  // --- KẾT THÚC PHẦN MỚI ---

  // Áp dụng cả .find() và .sort() vào câu lệnh
  const rooms = await Room.find(findQuery)
    .sort(sortQuery) // <-- THÊM PHƯƠNG THỨC SORT TẠI ĐÂY
    .populate("owner", "name email phone");

  res.json(rooms);
});

// Lấy chi tiết phòng
const getRoomById = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id)
    .populate("owner", "name email _id")
    .populate("reviews"); // <-- THÊM DÒNG NÀY để lấy thêm thông tin của các đánh giá

  if (!room) {
    res.status(404);
    throw new Error("Không tìm thấy phòng");
  }

  res.json(room);
});

// Tạo phòng mới
const createRoom = asyncHandler(async (req, res) => {
  try {
    // Xử lý ảnh upload
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((file) => file.path || file.secure_url);
    }

    const ownerId = req.user._id;
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

    // Xử lý tiện nghi
    const amenities = {};
    Object.keys(req.body).forEach((key) => {
      if (key.startsWith("amenities[") && key.endsWith("]")) {
        const amenityKey = key.substring(10, key.length - 1);
        amenities[amenityKey] = req.body[key] === "true";
      }
    });

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
      images: imageUrls,
      owner: ownerId,
    };

    const room = new Room(roomData);
    const createdRoom = await room.save();

    res.status(201).json(createdRoom);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo phòng", error: error.message });
  }
});

// Cập nhật phòng
const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);

  if (!room) {
    res.status(404);
    throw new Error("Không tìm thấy phòng");
  }

  // --- SỬA LẠI ĐIỀU KIỆN KIỂM TRA QUYỀN ---
  // Chỉ từ chối nếu người dùng KHÔNG PHẢI chủ phòng VÀ cũng KHÔNG PHẢI là Admin
  if (room.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error("Không có quyền sửa phòng này");
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
  } = req.body;

  // Ảnh mới upload
  const newImageUrls = req.files ? req.files.map((file) => file.path) : [];

  // Ảnh cũ còn lại
  let existingImageUrls = [];
  if (req.body.existingImages) {
    try {
      existingImageUrls = JSON.parse(req.body.existingImages);
      if (!Array.isArray(existingImageUrls)) existingImageUrls = [];
    } catch (e) {
      existingImageUrls = [];
    }
  }

  // Cập nhật dữ liệu
  room.title = title !== undefined ? title : room.title;
  room.description = description !== undefined ? description : room.description;
  room.price = price !== undefined ? Number(price) : room.price;
  room.address = address !== undefined ? address : room.address;
  room.city = city !== undefined ? city : room.city;
  room.district = district !== undefined ? district : room.district;
  room.area = area !== undefined ? Number(area) : room.area;
  room.bedrooms = bedrooms !== undefined ? Number(bedrooms) : room.bedrooms;
  room.bathrooms = bathrooms !== undefined ? Number(bathrooms) : room.bathrooms;
  room.images = [...existingImageUrls, ...newImageUrls];

  // --- Amenities update logic ---
  // Parse incoming amenities from req.body in the format amenities[key] = "true"
  const newAmenities = {};
  Object.keys(req.body).forEach((key) => {
    if (key.startsWith("amenities[") && key.endsWith("]")) {
      const amenityKey = key.substring(10, key.length - 1);
      newAmenities[amenityKey] = req.body[key] === "true";
    }
  });

  const amenityKeys = [
    "wifi",
    "air_conditioner",
    "washing_machine",
    "fridge",
    "parking",
    "security",
    "private_bathroom",
    "kitchen",
    "window",
    "balcony",
    "water_heater",
    "tv",
  ];

  const amenitiesReset = req.body.amenitiesReset === "true";
  if (!room.amenities) {
    room.amenities = {};
  }

  if (amenitiesReset) {
    // 1) Reset all amenity keys to false
    amenityKeys.forEach((key) => {
      room.amenities[key] = false;
    });

    // 2) Enable amenities provided in the request
    Object.entries(newAmenities).forEach(([key, value]) => {
      if (amenityKeys.includes(key) && value === true) {
        room.amenities[key] = true;
      }
    });
  } else if (Object.keys(newAmenities).length > 0) {
    // Merge update: set provided keys to their boolean value (typically true)
    Object.entries(newAmenities).forEach(([key, value]) => {
      if (amenityKeys.includes(key)) {
        room.amenities[key] = !!value;
      }
    });
  }

  const updatedRoom = await room.save();
  res.json(updatedRoom);
});

// Xóa phòng
const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);

  if (!room) {
    res.status(404);
    throw new Error("Không tìm thấy phòng");
  }

  // --- SỬA LẠI ĐIỀU KIỆN KIỂM TRA QUYỀN ---
  // Chỉ từ chối nếu người dùng KHÔNG PHẢI chủ phòng VÀ cũng KHÔNG PHẢI là Admin
  if (room.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error("Không có quyền xóa phòng này");
  }

  await room.deleteOne();
  res.json({ message: "Đã xóa phòng" });
});

// Lấy phòng của user hiện tại
const getMyRooms = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const rooms = await Room.find({ owner: userId }).populate(
      "owner",
      "name email"
    );
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách phòng" });
  }
});

/**
 * @desc    Tạo một đánh giá mới cho phòng trọ
 * @route   POST /api/rooms/:id/reviews
 * @access  Private (Yêu cầu đăng nhập)
 */
const createRoomReview = asyncHandler(async (req, res) => {
  // Lấy rating và comment từ body của request
  const { rating, comment } = req.body;
  const roomId = req.params.id;

  // Tìm phòng trọ mà người dùng muốn đánh giá
  const room = await Room.findById(roomId);

  // Nếu tìm thấy phòng trọ
  if (room) {
    // --- THÊM LOGIC KIỂM TRA MỚI TẠI ĐÂY ---
    // So sánh ID của người đăng nhập và ID của chủ phòng
    if (room.owner.toString() === req.user._id.toString()) {
      res.status(400); // Bad Request
      throw new Error("Bạn không thể tự đánh giá phòng của mình");
    }
    // --- Kết thúc logic mới ---

    // Kiểm tra xem người dùng này đã từng đánh giá phòng này chưa
    const alreadyReviewed = await Review.findOne({
      room: roomId,
      user: req.user._id, // req.user được lấy từ middleware 'protect'
    });

    if (alreadyReviewed) {
      res.status(400); // Bad Request
      throw new Error("Bạn đã đánh giá phòng này rồi");
    }

    // Nếu chưa, tạo một đối tượng đánh giá mới
    const review = new Review({
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
      room: roomId,
    });

    // Lưu đánh giá vào database
    await review.save();

    // Lấy tất cả review của phòng để tính lại điểm trung bình và số lượng
    const reviewsOfRoom = await Review.find({ room: roomId });
    room.numReviews = reviewsOfRoom.length;
    room.rating =
      reviewsOfRoom.reduce((acc, item) => item.rating + acc, 0) /
      reviewsOfRoom.length;

    // Lưu lại thông tin phòng trọ đã cập nhật
    await room.save();

    res.status(201).json({ message: "Đã thêm đánh giá thành công" });
  } else {
    res.status(404); // Not Found
    throw new Error("Không tìm thấy phòng trọ");
  }
});

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getMyRooms,
  createRoomReview, // <-- Thêm hàm mới vào đây
};
