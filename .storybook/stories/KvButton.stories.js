import KvButton from '@/components/Kv/KvButton';

export default { title: 'KV|KvButton' };

export const Default = () => ({
	components: { KvButton },
	template: '<kv-button>Button</kv-button>'
});

export const Disabled = () => ({
	components: { KvButton },
	template: '<kv-button disabled>Button</kv-button>'
});

export const AsALink = () => ({
	components: { KvButton },
	template: '<kv-button href="http://www.google.com">Button</kv-button>'
});
