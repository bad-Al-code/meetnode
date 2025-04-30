import { ChatRepository } from './chat.repository';

export class ChatService {
  constructor(private chatRepository: ChatRepository) {}
}
