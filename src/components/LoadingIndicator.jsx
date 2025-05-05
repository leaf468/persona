// src/components/LoadingIndicator.jsx
import "../styles/LoadingIndicator.css";

const LoadingIndicator = ({ message = "로딩 중..." }) => {
    return (
        <div className="loading-indicator">
            <div className="spinner">
                <div className="bounce1"></div>
                <div className="bounce2"></div>
                <div className="bounce3"></div>
            </div>
            <p className="loading-message">{message}</p>
        </div>
    );
};

export default LoadingIndicator;
