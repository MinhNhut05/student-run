import React, { useEffect, useState } from "react";
import roomService from "../../services/roomService";
import userService from "../../services/userService"; // <-- Thêm import
import { useAuth } from "../../context/authContext"; // <-- Thêm import
import RoomCard from "../../components/common/RoomCard/RoomCard";
import "./RoomListPage.scss";
import "rc-slider/assets/index.css";

// Define sort options
const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp đến cao" },
  { value: "price_desc", label: "Giá cao đến thấp" },
  { value: "area_asc", label: "Diện tích nhỏ đến lớn" },
  { value: "area_desc", label: "Diện tích lớn đến nhỏ" },
  { value: "rating_desc", label: "Đánh giá cao nhất" }, // <-- Thêm option mới
];

// Define amenities (aligned with backend schema)
const ALL_AMENITIES = [
  { id: "wifi", label: "Wi‑Fi" },
  { id: "air_conditioner", label: "Máy lạnh" },
  { id: "fridge", label: "Tủ lạnh" },
  { id: "washing_machine", label: "Máy giặt" },
  { id: "parking", label: "Chỗ để xe" },
  { id: "security", label: "Bảo vệ" },
  { id: "private_bathroom", label: "WC riêng" },
  { id: "kitchen", label: "Nhà bếp" },
  { id: "window", label: "Cửa sổ" },
  { id: "balcony", label: "Ban công" },
  { id: "water_heater", label: "Bình nóng lạnh" },
  { id: "tv", label: "TV" },
];

const RoomListPage = () => {
  const { user } = useAuth(); // <-- Thêm dòng này
  const [rooms, setRooms] = useState([]);
  const [favorites, setFavorites] = useState(new Set()); // <-- State mới lưu ds yêu thích
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State cho các bộ lọc
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");

  // Additional state for enhanced filtering
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  // Removed unsupported filters: ward, roomType, maxOccupancy
  const [amenities, setAmenities] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // Sửa lại đối tượng filters để thêm amenities
        const filters = {
          keyword: keyword.trim(),
          city: city.trim(),
          district: district.trim(),
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
          minArea: minArea ? parseFloat(minArea) : undefined,
          maxArea: maxArea ? parseFloat(maxArea) : undefined,
          sortBy: sortBy,
          amenities: amenities.length > 0 ? amenities.join(",") : undefined, // <-- THÊM DÒNG NÀY
        };
        const roomsData = await roomService.getRooms(filters);
        setRooms(roomsData);

        // Nếu người dùng đã đăng nhập, lấy danh sách yêu thích của họ
        if (user) {
          try {
            const favoriteData = await userService.getMyFavorites(user.token);
            // Lưu lại dưới dạng một Set để kiểm tra nhanh hơn
            setFavorites(new Set(favoriteData.map((fav) => fav._id)));
          } catch (favError) {
            console.error("Error fetching favorites:", favError);
            // Không hiển thị lỗi cho user vì đây không phải lỗi critical
          }
        } else {
          setFavorites(new Set()); // Clear favorites khi logout
        }
      } catch (err) {
        setError("Không thể tải danh sách phòng trọ");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [
    user,
    keyword,
    city,
    district,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    sortBy,
    amenities, // <-- THÊM amenities VÀO DEPENDENCY ARRAY
  ]); // <-- THÊM sortBy VÀO ĐÂY

  // Xử lý thay đổi tiện nghi
  const handleAmenityChange = (amenityId) => {
    if (amenities.includes(amenityId)) {
      setAmenities(amenities.filter((id) => id !== amenityId));
    } else {
      setAmenities([...amenities, amenityId]);
    }
  };

  // Reset bộ lọc
  const resetFilters = () => {
    setKeyword("");
    setCity("");
    setDistrict("");
    setMinPrice("");
    setMaxPrice("");
    setMinArea("");
    setMaxArea("");
    setSortBy("newest");
    setAmenities([]);
  };

  // Toggle filter modal
  const toggleFilterModal = () => {
    setShowFilterModal(!showFilterModal);
  };

  return (
    <div className="room-list-page">
      <div className="page-header">
        <h1>Danh sách phòng trọ cho sinh viên</h1>
        <button className="filter-toggle-button" onClick={toggleFilterModal}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line>
            <line x1="9" y1="8" x2="15" y2="8"></line>
            <line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
          Lọc phòng trọ
        </button>
      </div>

      {/* Applied filters tags */}
      <div className="applied-filters">
        {city && (
          <span className="filter-tag">
            Thành phố: {city} <button onClick={() => setCity("")}>×</button>
          </span>
        )}
        {district && (
          <span className="filter-tag">
            Quận/Huyện: {district}{" "}
            <button onClick={() => setDistrict("")}>×</button>
          </span>
        )}
        {minPrice && (
          <span className="filter-tag">
            Giá từ: {minPrice.toLocaleString()}đ{" "}
            <button onClick={() => setMinPrice("")}>×</button>
          </span>
        )}
        {maxPrice && (
          <span className="filter-tag">
            Giá đến: {maxPrice.toLocaleString()}đ{" "}
            <button onClick={() => setMaxPrice("")}>×</button>
          </span>
        )}
        {minArea && (
          <span className="filter-tag">
            Diện tích từ: {minArea}m²{" "}
            <button onClick={() => setMinArea("")}>×</button>
          </span>
        )}
        {maxArea && (
          <span className="filter-tag">
            Diện tích đến: {maxArea}m²{" "}
            <button onClick={() => setMaxArea("")}>×</button>
          </span>
        )}
        {/* roomType filter tag removed (unsupported) */}
        {amenities.length > 0 && (
          <span className="filter-tag">
            Tiện nghi: {amenities.length}{" "}
            <button onClick={() => setAmenities([])}>×</button>
          </span>
        )}
        {sortBy && sortBy !== "newest" && (
          <span className="filter-tag">
            Sắp xếp: {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
            <button onClick={() => setSortBy("newest")}>×</button>
          </span>
        )}
      </div>

      {/* Detailed filter modal */}
      {showFilterModal && (
        <div
          className="room-filter-overlay"
          onClick={() => setShowFilterModal(false)}
        >
          <div
            className="room-filter-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="filter-header">
              <h3>Bộ lọc chi tiết</h3>
              <button
                className="close-btn"
                onClick={() => setShowFilterModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="filter-scrollable-content">
              <div className="filter-group">
                <label htmlFor="keyword">Từ khóa</label>
                <input
                  type="text"
                  id="keyword"
                  placeholder="Tiêu đề, mô tả, địa chỉ..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="sortBy">Sắp xếp theo</label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Địa điểm</label>
                <input
                  type="text"
                  placeholder="Tỉnh/Thành phố"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Quận/Huyện"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
                {/* ward input removed (unsupported) */}
              </div>

              <div className="filter-group">
                <label>Khoảng giá (VNĐ/tháng)</label>
                <div className="range-inputs">
                  <input
                    type="number"
                    placeholder="Từ"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min="0"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Đến"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>Diện tích (m²)</label>
                <div className="range-inputs">
                  <input
                    type="number"
                    placeholder="Từ"
                    value={minArea}
                    onChange={(e) => setMinArea(e.target.value)}
                    min="0"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Đến"
                    value={maxArea}
                    onChange={(e) => setMaxArea(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              {/* roomType select removed (unsupported) */}

              {/* maxOccupancy input removed (unsupported) */}

              <div className="filter-group">
                <label>Tiện nghi</label>
                <div className="amenities-grid">
                  {ALL_AMENITIES.map((amenity) => (
                    <div key={amenity.id} className="amenity-item">
                      <input
                        type="checkbox"
                        id={`amenity-${amenity.id}`}
                        value={amenity.id}
                        checked={amenities.includes(amenity.id)}
                        onChange={() => handleAmenityChange(amenity.id)}
                      />
                      <label htmlFor={`amenity-${amenity.id}`}>
                        {amenity.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-actions">
              <button className="reset-btn" onClick={resetFilters}>
                Reset Lọc
              </button>
              <button
                className="apply-btn"
                onClick={() => setShowFilterModal(false)}
              >
                Xem kết quả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room listings */}
      {loading ? (
        <div className="loader-container">
          <div className="sk-folding-cube" aria-label="loading">
            <div className="sk-cube1 sk-cube"></div>
            <div className="sk-cube2 sk-cube"></div>
            <div className="sk-cube4 sk-cube"></div>
            <div className="sk-cube3 sk-cube"></div>
          </div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : rooms.length === 0 ? (
        <div className="no-results">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <p>Không tìm thấy phòng trọ nào phù hợp với tiêu chí lọc.</p>
          <button onClick={resetFilters}>Xóa bộ lọc</button>
        </div>
      ) : (
        <div className="room-list-grid">
          {rooms.map((room) => {
            // Kiểm tra xem phòng này có trong danh sách yêu thích không
            const isInitiallySaved = favorites.has(room._id);
            return (
              <RoomCard
                key={room._id}
                room={room}
                isInitiallySaved={isInitiallySaved} // <-- Truyền prop mới
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoomListPage;
