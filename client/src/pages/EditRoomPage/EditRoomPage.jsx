import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import roomService from "../../services/roomService";
import "./EditRoomPage.scss";

// Amenity keys used across the system
const ALL_AMENITIES = [
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

const EditRoomPage = () => {
  const { id: roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");

  // Amenities state: initialize all keys to false
  const [amenities, setAmenities] = useState(() =>
    ALL_AMENITIES.reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {})
  );

  const [existingImages, setExistingImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [fileNames, setFileNames] = useState("Chưa có tệp mới nào được chọn");

  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchRoom = async () => {
      try {
        setFetchLoading(true);
        const roomData = await roomService.getRoomById(roomId);

        // --- SỬA LẠI ĐIỀU KIỆN KIỂM TRA QUYỀN ---
        // Chỉ chuyển hướng nếu người dùng KHÔNG PHẢI chủ phòng VÀ cũng KHÔNG PHẢI là Admin
        if (
          roomData.owner._id.toString() !== user._id.toString() &&
          !user.isAdmin
        ) {
          alert("Bạn không có quyền sửa phòng trọ này.");
          navigate("/my-rooms");
          return;
        }

        setTitle(roomData.title || "");
        setDescription(roomData.description || "");
        setPrice(roomData.price?.toString() || "");
        setAddress(roomData.address || "");
        setCity(roomData.city || "");
        setDistrict(roomData.district || "");
        setArea(roomData.area?.toString() || "");
        setBedrooms(roomData.bedrooms?.toString() || "");
        setBathrooms(roomData.bathrooms?.toString() || "");
        setExistingImages(roomData.images || []);

        // Update amenities state from API data
        setAmenities(() => {
          const next = ALL_AMENITIES.reduce((acc, key) => {
            acc[key] = false;
            return acc;
          }, {});
          const apiAmenities = roomData.amenities || {};
          ALL_AMENITIES.forEach((key) => {
            if (apiAmenities[key] === true) next[key] = true;
          });
          return next;
        });
      } catch (err) {
        setFetchError("Không thể tải dữ liệu phòng");
      } finally {
        setFetchLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, user, navigate]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    if (existingImages.length + files.length > 10) {
      setSubmitError("Tổng số ảnh không vượt quá 10");
      setSelectedFiles([]);
      setImagePreviews([]);
      setFileNames("Chưa có tệp mới nào được chọn");
      return;
    }

    setSubmitError(null);
    setSelectedFiles(files);
    setFileNames(
      files.length > 0
        ? `${files.length} tệp mới đã được chọn`
        : "Chưa có tệp mới nào được chọn"
    );

    const previews = files.map((file) => URL.createObjectURL(file));
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews(previews);
  };

  const handleFileButtonClick = () => {
    document.getElementById("room-images").click();
  };

  const handleRemoveExistingImage = (url) => {
    setExistingImages(existingImages.filter((img) => img !== url));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);
    setSubmitLoading(true);

    if (!title || !description || !price || !address || !city) {
      setSubmitError("Vui lòng nhập đủ thông tin bắt buộc");
      setSubmitLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("address", address);
    formData.append("city", city);
    if (district) formData.append("district", district);
    if (area) formData.append("area", area);
    if (bedrooms) formData.append("bedrooms", bedrooms);
    if (bathrooms) formData.append("bathrooms", bathrooms);

    formData.append("existingImages", JSON.stringify(existingImages));

    // Ensure backend resets amenities then reapplies the ones currently checked
    formData.append("amenitiesReset", "true");
    ALL_AMENITIES.forEach((key) => {
      if (amenities[key]) {
        formData.append(`amenities[${key}]`, "true");
      }
    });

    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    try {
      const result = await roomService.updateRoom(roomId, formData, user.token);
      setSubmitSuccess(true);
      setSelectedFiles([]);
      setImagePreviews([]);
      setExistingImages(result.images || []);

      setTimeout(() => navigate("/my-rooms"), 2000);
    } catch (err) {
      setSubmitError(err.message || "Cập nhật thất bại");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAmenityChange = (e) => {
    const { name, checked } = e.target;
    setAmenities((prev) => ({ ...prev, [name]: checked }));
  };

  if (fetchLoading)
    return (
      <div className="loader-container">
        <div className="sk-folding-cube" aria-label="loading">
          <div className="sk-cube1 sk-cube"></div>
          <div className="sk-cube2 sk-cube"></div>
          <div className="sk-cube4 sk-cube"></div>
          <div className="sk-cube3 sk-cube"></div>
        </div>
        <p>Đang tải thông tin phòng...</p>
      </div>
    );
  if (fetchError) return <div className="error-message">{fetchError}</div>;

  return (
    <div className="dark-theme-container">
      {/* Floating gradient shapes */}
      <div className="profile-bg-shape shape-1"></div>
      <div className="profile-bg-shape shape-2"></div>
      <div className="profile-bg-shape shape-3"></div>
      <div className="profile-bg-shape shape-4"></div>
      <div className="profile-bg-shape shape-5"></div>
      <div className="profile-bg-shape shape-6"></div>

      <div className="form-page-wrapper">
        <div className="form-header">
          <h1>CHỈNH SỬA THÔNG TIN PHÒNG TRỌ</h1>
          <p>Cập nhật chi tiết phòng trọ để thu hút nhiều người thuê hơn</p>
        </div>

        {submitError && <div className="error-message">{submitError}</div>}
        {submitSuccess && (
          <div className="success-message">Cập nhật thành công!</div>
        )}

        <form className="post-room-form" onSubmit={handleSubmit}>
          {/* Left Column */}
          <div className="form-left-column">
            {/* Basic Information Section */}
            <div className="form-section">
              <h3 className="section-title">📝 Thông tin cơ bản</h3>

              <div className="form-field-group">
                <div className="input-with-icon">
                  <input
                    type="text"
                    id="title"
                    placeholder="Tiêu đề tin đăng *"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                  <span className="icon-placeholder">✎</span>
                </div>
              </div>

              <div className="form-field-group">
                <textarea
                  id="description"
                  placeholder="Mô tả chi tiết về phòng trọ *"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="5"
                  required
                ></textarea>
              </div>
            </div>

            {/* Price and Details Section */}
            <div className="form-section">
              <h3 className="section-title">💰 Giá và chi tiết</h3>

              <div className="form-row">
                <div className="form-field-group">
                  <div className="input-with-icon">
                    <input
                      type="number"
                      id="price"
                      placeholder="Giá (VNĐ/tháng) *"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                    <span className="icon-placeholder">₫</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <div className="input-with-icon">
                    <input
                      type="number"
                      id="area"
                      placeholder="Diện tích (m²)"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    />
                    <span className="icon-placeholder">📐</span>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field-group">
                  <div className="input-with-icon">
                    <input
                      type="number"
                      id="bedrooms"
                      placeholder="Số phòng ngủ"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                    />
                    <span className="icon-placeholder">🛏️</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <div className="input-with-icon">
                    <input
                      type="number"
                      id="bathrooms"
                      placeholder="Số phòng tắm"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                    />
                    <span className="icon-placeholder">🚿</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="form-right-column">
            {/* Location Section */}
            <div className="form-section">
              <h3 className="section-title">📍 Địa chỉ</h3>

              <div className="form-field-group">
                <div className="input-with-icon">
                  <input
                    type="text"
                    id="address"
                    placeholder="Địa chỉ chi tiết *"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                  <span className="icon-placeholder">📍</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field-group">
                  <div className="input-with-icon">
                    <input
                      type="text"
                      id="city"
                      placeholder="Tỉnh/Thành phố *"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                    <span className="icon-placeholder">🏙️</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <div className="input-with-icon">
                    <input
                      type="text"
                      id="district"
                      placeholder="Quận/Huyện"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                    <span className="icon-placeholder">🏘️</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Images Section */}
            <div className="form-section">
              <h3 className="section-title">📷 Quản lý hình ảnh</h3>

              {existingImages.length > 0 && (
                <div className="existing-images-section">
                  <label className="file-upload-label">Ảnh hiện có:</label>
                  <div className="existing-images-grid">
                    {existingImages.map((url, i) => (
                      <div key={i} className="existing-image-container">
                        <img
                          src={url}
                          alt={`existing-${i}`}
                          className="existing-image"
                        />
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={() => handleRemoveExistingImage(url)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-field-group">
                <label htmlFor="room-images" className="file-upload-label">
                  Chọn thêm ảnh phòng (Còn lại {10 - existingImages.length} ảnh)
                </label>
                <div className="custom-file-upload">
                  <input
                    type="file"
                    id="room-images"
                    multiple
                    accept="image/*"
                    className="native-file-input"
                    onChange={handleFileChange}
                    disabled={existingImages.length >= 10}
                  />
                  <button
                    type="button"
                    className="file-upload-button"
                    onClick={handleFileButtonClick}
                    disabled={existingImages.length >= 10}
                  >
                    <span className="icon-placeholder">📁</span> Chọn Tệp
                  </button>
                  <span className="file-upload-text">{fileNames}</span>
                </div>
              </div>

              {imagePreviews.length > 0 && (
                <div className="new-images-preview">
                  <label className="file-upload-label">Ảnh mới đã chọn:</label>
                  <div className="existing-images-grid">
                    {imagePreviews.map((url, i) => (
                      <div key={i} className="existing-image-container">
                        <img
                          src={url}
                          alt={`preview-${i}`}
                          className="existing-image"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Amenities Section - Full Width */}
          <div
            className="form-section amenities-section"
            style={{ gridColumn: "1 / -1" }}
          >
            <h3 className="section-title">⭐ Tiện nghi</h3>
            <div className="amenities-grid">
              {ALL_AMENITIES.map((key) => (
                <div key={key} className="amenity-checkbox">
                  <input
                    type="checkbox"
                    id={`amenity-${key}`}
                    name={key}
                    checked={!!amenities[key]}
                    onChange={handleAmenityChange}
                  />
                  <label htmlFor={`amenity-${key}`}>
                    {key === "wifi" && "📶 Wi-Fi"}
                    {key === "air_conditioner" && "❄️ Máy lạnh"}
                    {key === "washing_machine" && "🧺 Máy giặt"}
                    {key === "fridge" && "🧊 Tủ lạnh"}
                    {key === "parking" && "🏍️ Chỗ để xe"}
                    {key === "security" && "🛡️ Bảo vệ"}
                    {key === "private_bathroom" && "🚿 WC riêng"}
                    {key === "kitchen" && "🍳 Nhà bếp"}
                    {key === "window" && "🪟 Cửa sổ"}
                    {key === "balcony" && "🏡 Ban công"}
                    {key === "water_heater" && "🔥 Máy nước nóng"}
                    {key === "tv" && "📺 TV"}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={submitLoading}
            >
              {submitLoading ? "ĐANG XỬ LÝ..." : "CẬP NHẬT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRoomPage;
