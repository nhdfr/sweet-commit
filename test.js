import { text } from '@clack/prompts';

const meaning = await text({
    message: 'What is the meaning of life?',
    placeholder: 'Not sure',
    initialValue: '42',
});
