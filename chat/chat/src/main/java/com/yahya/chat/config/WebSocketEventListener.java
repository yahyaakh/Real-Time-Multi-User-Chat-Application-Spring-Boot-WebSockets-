package com.yahya.chat.config;

import com.yahya.chat.Chat.ChatMessage;
import com.yahya.chat.Chat.MessageType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j // for logging
public class WebSocketEventListener {

    private final SimpMessageSendingOperations messageTemplate;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

        Optional.ofNullable(headerAccessor.getSessionAttributes())
                .map(attrs -> attrs.get("username"))
                .ifPresent(username -> {
                    log.info("User disconnected: {}", username);

                    var chatMessage = ChatMessage.builder()
                            .type(MessageType.LEAVE)
                            .sender(username.toString()) // Ensure it's a String
                            .build();

                    messageTemplate.convertAndSend("/topic/public", chatMessage);
                });
    }
}
