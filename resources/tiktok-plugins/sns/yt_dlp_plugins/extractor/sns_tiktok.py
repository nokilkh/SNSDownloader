import re
from yt_dlp.extractor.tiktok import TikTokUserIE


class SNSAccountIE(TikTokUserIE):
    """Keep media fields from the account extractor's existing public response."""
    IE_NAME = 'sns:tiktok'

    def _real_extract(self, url):
        user_name = self._match_id(url)
        sec_uid = (self._configuration_arg('sec_uid', ie_key='snsaccount', casesense=True) or [None])[0]
        if sec_uid and re.fullmatch(r'MS4wLjABAAAA[\w-]+', sec_uid):
            return self.playlist_result(self._entries(sec_uid, user_name, False), sec_uid, user_name)
        return super()._real_extract(url)

    def _entries(self, *args, **kwargs):
        wanted = self._configuration_arg('post_id', ie_key='snsaccount')
        for entry in super()._entries(*args, **kwargs):
            if not wanted or str(entry.get('id')) == wanted[0]:
                yield entry
                if wanted:
                    return

    def _download_json(self, url, *args, **kwargs):
        result = super()._download_json(url, *args, **kwargs)
        if url == self._API_BASE_URL and isinstance(result, dict):
            items = result.get('itemList') or []
            for index, item in enumerate(items):
                if isinstance(item, dict):
                    item['_sns_last'] = (index == len(items) - 1
                                         and result.get('hasMorePrevious') in (False, 0))
        return result

    def _parse_aweme_video_web(self, aweme, *args, **kwargs):
        result = super()._parse_aweme_video_web(aweme, *args, **kwargs)
        if not isinstance(aweme, dict):
            return result
        author = aweme.get('author') if isinstance(aweme.get('author'), dict) else {}
        video = aweme.get('video') if isinstance(aweme.get('video'), dict) else {}
        result['sns_item'] = {
            'id': aweme.get('id'), 'createTime': aweme.get('createTime'),
            'desc': aweme.get('desc'), 'author': {k: author.get(k) for k in ('id', 'uniqueId', 'secUid')},
            'imagePost': aweme.get('imagePost') or aweme.get('imagePostInfo'),
            'video': {k: video.get(k) for k in ('bitrateInfo', 'width', 'height', 'playAddr')},
            'last': aweme.get('_sns_last', False),
        }
        return result
