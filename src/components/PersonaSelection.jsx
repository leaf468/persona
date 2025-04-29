// src/components/PersonaSelection.jsx

import { useState } from "react";
import PersonaCard from "./PersonaCard";
import "../styles/PersonaSelection.css";

const PersonaSelection = ({ personas, onPersonaSelect, onChatStart }) => {
    const [selectedPersonaId, setSelectedPersonaId] = useState(null);

    const handlePersonaSelect = (personaId) => {
        console.log("선택된 페르소나 ID:", personaId);
        setSelectedPersonaId(personaId);
        onPersonaSelect(personaId);
    };

    const handleChatStart = (personaId) => {
        console.log("채팅 시작 요청:", personaId);
        onChatStart(personaId);
    };

    return (
        <div className="persona-selection">
            <h2 className="selection-title">생성된 페르소나</h2>
            <p className="selection-subtitle">
                다음 중 대화할 페르소나를 선택하세요.
            </p>

            <div className="personas-grid">
                {personas.map((persona) => (
                    <PersonaCard
                        key={persona.id}
                        persona={persona}
                        isSelected={selectedPersonaId === persona.id}
                        onSelect={handlePersonaSelect}
                        onChatStart={handleChatStart}
                    />
                ))}
            </div>
        </div>
    );
};

export default PersonaSelection;
