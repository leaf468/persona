import { useState, useEffect } from "react";
import PersonaGenerator from "./components/PersonaGenerator";
import { parseStatisticalData } from "./services/statisticalDataProcessor";
import "./styles/App.css";

function App() {
    const [statsData, setStatsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 통계 데이터 파일 로드
        const loadStatisticalData = async () => {
            try {
                setIsLoading(true);

                // Vite에서 텍스트 파일 가져오기
                const response = await fetch("/stats_report_demo.txt");
                const textContent = await response.text();

                // 통계 데이터 파싱
                const parsedData = parseStatisticalData(textContent);

                setStatsData(parsedData);
                setIsLoading(false);
            } catch (error) {
                console.error("통계 데이터 로드 중 오류 발생:", error);
                setError("통계 데이터를 로드하는 중 오류가 발생했습니다.");
                setIsLoading(false);
            }
        };

        loadStatisticalData();
    }, []);

    return (
        <div>
            <header className="header">
                <div className="container">
                    <h1 className="header-title">AI 기반 페르소나 생성기</h1>
                    <p className="header-subtitle">
                        통계 데이터 기반으로 정확한 타겟 페르소나 생성
                    </p>
                </div>
            </header>

            <main className="main">
                <div className="container">
                    {isLoading ? (
                        <div className="loading">
                            <div className="spinner"></div>
                            <p className="loading-text">
                                통계 데이터 로드 중...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="error">
                            <p className="error-title">오류</p>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <PersonaGenerator statsData={statsData} />
                    )}
                </div>
            </main>

            <footer className="footer">
                <div className="container">
                    <p className="footer-content">
                        © 2025 AI 기반 페르소나 생성기 - 통계 데이터를 활용한
                        정확한 페르소나 생성 서비스
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default App;
