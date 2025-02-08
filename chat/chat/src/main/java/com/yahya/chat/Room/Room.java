package com.yahya.chat.Room;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Room {



    private String name;

    private String password;

    private RoomType type;


}
