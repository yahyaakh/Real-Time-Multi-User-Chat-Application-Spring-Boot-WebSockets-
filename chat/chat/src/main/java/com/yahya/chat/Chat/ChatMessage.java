package com.yahya.chat.Chat;


import lombok.*;

@Getter

@Setter

@AllArgsConstructor

@NoArgsConstructor

@Builder



public class ChatMessage {


    private String content ;
    private  String sender ;

    private MessageType type;

    private String room; //  room name associated with the message

}
