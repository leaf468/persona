// src/App.jsx - Updated with Data Visualization feature
import { useState, useEffect } from "react";
import PersonaGenerator from "./components/PersonaGenerator";
import ConsultantChatbot from "./components/ConsultantChatbot";
import DataVisualizationDashboard from "./components/DataVisualizationDashboard";
import { parseStatisticalData } from "./services/statisticalDataProcessor";
import { loadConsultantFiles } from "./services/consultantService";
import "./styles/App.css";

function App() {
    const [statsData, setStatsData] = useState(null);
    const [consultantData, setConsultantData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Updated to include "datavis" tab
    const [activeTab, setActiveTab] = useState("persona"); // "persona", "consultant", or "datavis"

    useEffect(() => {
        // 통계 데이터 및 컨설턴트 파일 로드
        const loadData = async () => {
            try {
                setIsLoading(true);

                // 통계 데이터 파일 로드 (페르소나 생성용)
                const statsResponse = await fetch("/stats_report_demo.txt");
                const statsText = await statsResponse.text();
                const parsedStats = parseStatisticalData(statsText);
                setStatsData(parsedStats);

                // 컨설턴트 문서 파일 목록 (실제 파일 이름으로 대체 필요)
                const consultantFileNames = [
                    "business_strategy.txt",
                    "marketing_guide.txt",
                    "hr_management.txt",
                    "financial_planning.txt",
                    "innovation_frameworks.txt",
                ];

                // 컨설턴트 파일 로드
                const loadedFiles = await loadConsultantFiles(
                    consultantFileNames
                );
                setConsultantData({ files: loadedFiles });

                setIsLoading(false);
            } catch (error) {
                console.error("데이터 로드 중 오류 발생:", error);
                setError("데이터를 로드하는 중 오류가 발생했습니다.");
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // 탭 전환 핸들러
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className="app-wrapper">
            <header className="header">
                <div className="container">
                    <h1 className="header-title">MarketLenz AI 기반 비즈니스 솔루션</h1>
                    <p className="header-subtitle">
                        페르소나 생성, 데이터 시각화 및 경영 컨설팅 서비스
                    </p>
                    <div className="tab-navigation">
                        <button
                            className={`tab-nav-button ${
                                activeTab === "persona" ? "active" : ""
                            }`}
                            onClick={() => handleTabChange("persona")}
                        >
                            페르소나 생성기
                        </button>
                        <button
                            className={`tab-nav-button ${
                                activeTab === "datavis" ? "active" : ""
                            }`}
                            onClick={() => handleTabChange("datavis")}
                        >
                            데이터 시각화
                        </button>
                        <button
                            className={`tab-nav-button ${
                                activeTab === "consultant" ? "active" : ""
                            }`}
                            onClick={() => handleTabChange("consultant")}
                        >
                            경영 컨설턴트
                        </button>
                    </div>
                </div>
            </header>

            <main className="main">
                <div className="container">
                    {isLoading ? (
                        <div className="loading">
                            <div className="spinner"></div>
                            <p className="loading-text">데이터 로드 중...</p>
                        </div>
                    ) : error ? (
                        <div className="error">
                            <p className="error-title">오류</p>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="app-content">
                            {activeTab === "persona" ? (
                                <PersonaGenerator statsData={statsData} />
                            ) : activeTab === "datavis" ? (
                                <DataVisualizationDashboard />
                            ) : (
                                <ConsultantChatbot
                                    consultantData={consultantData}
                                />
                            )}
                        </div>
                    )}
                </div>
            </main>

            <footer className="footer">
                <div className="container">
                    <p className="footer-content">
                        © 2025 MarketLenz AI 기반 비즈니스 솔루션 - 데이터 기반 의사결정을
                        위한 최적의 파트너
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default App;
