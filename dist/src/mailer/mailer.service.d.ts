export declare class MailerService {
    private transporter;
    send(to: string, subject: string, html: string): Promise<any>;
}
